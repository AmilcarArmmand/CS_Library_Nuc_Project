import { eq } from 'drizzle-orm';
import { books } from '../db/schema/schema.js';
import { connectDatabase, db, pool } from '../db/database.js';
import {
  fetchOpenLibraryBookByIsbn,
  hasIncompleteCatalogMetadata,
  mergeCatalogBookMetadata,
  normalizeIsbn,
} from '../utils/openLibrary.js';

type EnrichOptions = {
  isbn?: string;
  includeComplete: boolean;
  force: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): EnrichOptions {
  const isbnArg = argv.find((arg) => arg.startsWith('--isbn='));
  return {
    isbn: isbnArg ? normalizeIsbn(isbnArg.split('=').slice(1).join('=')) : undefined,
    includeComplete: argv.includes('--all'),
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
  };
}

async function run(options: EnrichOptions) {
  await connectDatabase();

  const records = options.isbn
    ? await db.select().from(books).where(eq(books.isbn, options.isbn))
    : await db.select().from(books).orderBy(books.title);

  if (records.length === 0) {
    throw new Error(options.isbn ? `No book found with ISBN ${options.isbn}.` : 'No books found in the catalog.');
  }

  const targets = options.isbn
    ? records
    : records.filter((book) => options.includeComplete || hasIncompleteCatalogMetadata(book));

  console.log(`Inspecting ${targets.length} catalog entries for Open Library enrichment...`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of targets) {
    try {
      const metadata = await fetchOpenLibraryBookByIsbn(record.isbn);
      if (!metadata) {
        console.warn(`No Open Library metadata found for ${record.isbn}.`);
        skipped++;
        continue;
      }

      const update = mergeCatalogBookMetadata(record, metadata, { force: options.force });
      if (Object.keys(update).length === 0) {
        skipped++;
        continue;
      }

      if (!options.dryRun) {
        await db.update(books).set(update).where(eq(books.isbn, record.isbn));
      }

      console.log(`Enriched ${record.isbn}: ${record.title} -> ${update.title ?? record.title}`);
      updated++;
    } catch (error) {
      failed++;
      console.error(`Failed to enrich ${record.isbn}:`, error);
    }
  }

  console.log('');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed : ${failed}`);
  console.log(options.dryRun ? 'Dry run only: no database changes were written.' : 'Enrichment complete.');
}

run(parseArgs(process.argv.slice(2)))
  .catch((error) => {
    console.error('Book enrichment failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
