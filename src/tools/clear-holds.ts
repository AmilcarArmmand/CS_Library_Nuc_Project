// Removes stale holds from the holds table and resets the book status to Available.
//
// Usage:
//   npx tsx src/tools/clear-holds.ts              — clears holds older than 7 days (default)
//   npx tsx src/tools/clear-holds.ts 3            — clears holds older than 3 days
//   npx tsx src/tools/clear-holds.ts --isbn <isbn> — clears hold on one specific book

import { db } from '../db/database.js';
import { holds, books } from '../db/schema/schema.js';
import { eq, lt, and } from 'drizzle-orm';

const args      = process.argv.slice(2);
const isbnFlag  = args.indexOf('--isbn');
const isbn      = isbnFlag !== -1 ? args[isbnFlag + 1] : null;
const days      = !isbn && args[0] ? parseInt(args[0], 10) : 7;

async function clearByIsbn(targetIsbn: string) {
  // Find the hold first so we can confirm it exists
  const [hold] = await db
    .select()
    .from(holds)
    .where(and(
      eq(holds.isbn, targetIsbn),
      eq(holds.status, 'pending'),
    ))
    .limit(1);

  if (!hold) {
    console.log(`No pending hold found for ISBN ${targetIsbn}.`);
    return;
  }

  // Delete the hold record
  await db
    .delete(holds)
    .where(eq(holds.id, hold.id));

  // Reset the book status back to Available
  await db
    .update(books)
    .set({ status: 'Available' })
    .where(eq(books.isbn, targetIsbn));

  console.log(`✓ Hold removed for ISBN ${targetIsbn} (was held by user ${hold.userId}).`);
  console.log(`✓ Book status reset to Available.`);
}

async function clearByAge(olderThanDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  // Find all stale pending holds
  const staleHolds = await db
    .select()
    .from(holds)
    .where(and(
      eq(holds.status, 'pending'),
      lt(holds.createdAt, cutoff),
    ));

  if (staleHolds.length === 0) {
    console.log(`No pending holds older than ${olderThanDays} day(s) found.`);
    return;
  }

  console.log(`Found ${staleHolds.length} stale hold(s) — removing...`);

  for (const hold of staleHolds) {
    // Delete the hold record
    await db
      .delete(holds)
      .where(eq(holds.id, hold.id));

    // Reset the book status back to Available
    await db
      .update(books)
      .set({ status: 'Available' })
      .where(eq(books.isbn, hold.isbn));

    console.log(`  ✓ ISBN ${hold.isbn} — held by user ${hold.userId} since ${hold.createdAt?.toLocaleDateString()}`);
  }

  console.log(`\n✓ Done. ${staleHolds.length} hold(s) removed, book status reset to Available.`);
}

async function run() {
  if (isbn) {
    await clearByIsbn(isbn);
  } else {
    if (isNaN(days) || days < 1) {
      console.error('Invalid number of days. Usage: npx tsx src/tools/clear-holds.ts <days>');
      process.exit(1);
    }
    console.log(`Clearing pending holds older than ${days} day(s)...`);
    await clearByAge(days);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});