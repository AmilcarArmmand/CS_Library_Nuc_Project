import { readFile } from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { books } from '../db/schema/schema.js';
import { connectDatabase, db, pool } from '../db/database.js';
import {
  buildOpenLibraryCoverUrl,
  fetchOpenLibraryBookByIsbn,
  mergeCatalogBookMetadata,
  normalizeIsbn,
} from '../utils/openLibrary.js';

type ImportOptions = {
  filePath: string;
  updateExisting: boolean;
  enrichMissing: boolean;
  forceMetadata: boolean;
  dryRun: boolean;
  defaultShelf: string;
  defaultStatus: 'Available' | 'Checked Out';
};

type ParsedRow = Record<string, string>;

type Summary = {
  inserted: number;
  updated: number;
  skipped: number;
  invalid: number;
  failed: number;
};

function printUsage(): never {
  console.error(
    'Usage: npx tsx src/tools/import-books.ts <file.csv|file.tsv> [--update] [--enrich-missing] [--force-metadata] [--dry-run] [--default-shelf=Unsorted] [--default-status=Available]',
  );
  process.exit(1);
}

function parseArgs(argv: string[]): ImportOptions {
  const filePath = argv.find((arg) => !arg.startsWith('--'));
  if (!filePath) {
    printUsage();
  }

  const defaultShelfArg = argv.find((arg) => arg.startsWith('--default-shelf='));
  const defaultStatusArg = argv.find((arg) => arg.startsWith('--default-status='));
  const defaultStatusValue = defaultStatusArg?.split('=')[1]?.trim().toLowerCase();

  return {
    filePath,
    updateExisting: argv.includes('--update'),
    enrichMissing: argv.includes('--enrich-missing'),
    forceMetadata: argv.includes('--force-metadata'),
    dryRun: argv.includes('--dry-run'),
    defaultShelf: defaultShelfArg?.split('=').slice(1).join('=').trim() || 'Unsorted',
    defaultStatus: defaultStatusValue === 'checked out' || defaultStatusValue === 'checked-out'
      ? 'Checked Out'
      : 'Available',
  };
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index++;
      }
      row.push(value.trim());
      value = '';

      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function detectDelimiter(filePath: string, text: string): string {
  if (filePath.toLowerCase().endsWith('.tsv')) {
    return '\t';
  }

  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

function rowsToObjects(rows: string[][]): ParsedRow[] {
  const headerRow = rows[0];
  if (!headerRow) return [];

  const headers = headerRow.map(normalizeHeader);
  return rows.slice(1).map((row) => {
    const record: ParsedRow = {};
    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() || '';
    });
    return record;
  });
}

function getField(row: ParsedRow, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value) return value;
  }
  return '';
}

function normalizeStatus(value: string, fallback: 'Available' | 'Checked Out'): 'Available' | 'Checked Out' {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === 'checked out' || normalized === 'checked-out' ? 'Checked Out' : 'Available';
}

async function importBooks(options: ImportOptions) {
  await connectDatabase();

  const absolutePath = path.resolve(options.filePath);
  const rawText = await readFile(absolutePath, 'utf8');
  const delimiter = detectDelimiter(absolutePath, rawText);
  const rows = rowsToObjects(parseDelimited(rawText, delimiter));

  if (rows.length === 0) {
    throw new Error('No data rows found in the import file.');
  }

  const summary: Summary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
    failed: 0,
  };

  console.log(`Importing ${rows.length} rows from ${absolutePath}`);

  for (const [index, row] of rows.entries()) {
    const lineNumber = index + 2;
    const isbn = normalizeIsbn(getField(row, ['isbn', 'isbn13', 'isbn10', 'barcode']));

    if (!isbn) {
      console.warn(`Line ${lineNumber}: skipped row with missing/invalid ISBN.`);
      summary.invalid++;
      continue;
    }

    try {
      const [existingBook] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);

      const explicitTitle = getField(row, ['title', 'booktitle', 'name']);
      const explicitAuthor = getField(row, ['author', 'authors']);
      const explicitCover = getField(row, ['cover', 'coverurl', 'image', 'imageurl']);
      const explicitShelf = getField(row, ['shelf', 'location']);
      const explicitStatus = getField(row, ['status']);

      const needsLookup = options.enrichMissing && (!explicitTitle || !explicitAuthor || !explicitCover);
      const metadata = needsLookup || options.forceMetadata
        ? await fetchOpenLibraryBookByIsbn(isbn).catch(() => null)
        : null;

      if (existingBook) {
        if (!options.updateExisting) {
          summary.skipped++;
          continue;
        }

        const metadataUpdate = metadata
          ? mergeCatalogBookMetadata(existingBook, metadata, { force: options.forceMetadata })
          : {};

        const updatePayload = {
          title: explicitTitle || metadataUpdate.title || existingBook.title,
          author: explicitAuthor || metadataUpdate.author || existingBook.author,
          cover: explicitCover || metadataUpdate.cover || existingBook.cover,
          shelf: explicitShelf || existingBook.shelf || options.defaultShelf,
          status: explicitStatus ? normalizeStatus(explicitStatus, existingBook.status as 'Available' | 'Checked Out') : existingBook.status,
        };

        const changed =
          updatePayload.title !== existingBook.title ||
          updatePayload.author !== existingBook.author ||
          updatePayload.cover !== existingBook.cover ||
          updatePayload.shelf !== existingBook.shelf ||
          updatePayload.status !== existingBook.status;

        if (!changed) {
          summary.skipped++;
          continue;
        }

        if (!options.dryRun) {
          await db.update(books).set(updatePayload).where(eq(books.isbn, isbn));
        }

        console.log(`Updated ${isbn}: ${updatePayload.title}`);
        summary.updated++;
        continue;
      }

      const title = explicitTitle || metadata?.title || `Unknown Title (${isbn})`;
      const author = explicitAuthor || metadata?.author || 'Unknown Author';
      const cover = explicitCover || metadata?.cover || buildOpenLibraryCoverUrl(isbn);
      const shelf = explicitShelf || options.defaultShelf;
      const status = normalizeStatus(explicitStatus, options.defaultStatus);

      if (!options.dryRun) {
        await db.insert(books).values({
          isbn,
          title,
          author,
          cover,
          shelf,
          status,
        });
      }

      console.log(`Inserted ${isbn}: ${title}`);
      summary.inserted++;
    } catch (error) {
      summary.failed++;
      console.error(`Line ${lineNumber}: failed to import ${isbn}:`, error);
    }
  }

  console.log('');
  console.log(`Inserted: ${summary.inserted}`);
  console.log(`Updated : ${summary.updated}`);
  console.log(`Skipped : ${summary.skipped}`);
  console.log(`Invalid : ${summary.invalid}`);
  console.log(`Failed  : ${summary.failed}`);
  console.log(options.dryRun ? 'Dry run only: no database changes were written.' : 'Import complete.');
}

const options = parseArgs(process.argv.slice(2));

importBooks(options)
  .catch((error) => {
    console.error('Book import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
