// Clears holds that have been pending for too long.
// Usage:
//   npx tsx src/scripts/clear-holds.ts           — clears holds older than 7 days (default)
//   npx tsx src/scripts/clear-holds.ts 3         — clears holds older than 3 days
//   npx tsx src/scripts/clear-holds.ts --isbn 9780132350884  — clears hold on a specific book

import { db } from '../db/database.js';
import { holds } from '../db/schema/schema.js';
import { eq, lt, and } from 'drizzle-orm';

const args    = process.argv.slice(2);
const isbnFlag = args.indexOf('--isbn');
const isbn    = isbnFlag !== -1 ? args[isbnFlag + 1] : null;
const days    = !isbn && args[0] ? parseInt(args[0]) : 7;

async function run() {
  if (isbn) {
    // Clear hold on a specific book
    const result = await db
      .update(holds)
      .set({ status: 'cancelled' })
      .where(and(
        eq(holds.isbn, isbn),
        eq(holds.status, 'pending'),
      ))
      .returning();

    if (result.length === 0) {
      console.log(`No pending hold found for ISBN ${isbn}.`);
    } else {
      console.log(`✓ Cancelled hold on ISBN ${isbn} for user ${result[0].userId}.`);
    }

  } else {
    // Clear all holds older than N days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await db
      .update(holds)
      .set({ status: 'cancelled' })
      .where(and(
        eq(holds.status, 'pending'),
        lt(holds.createdAt, cutoff),
      ))
      .returning();

    if (result.length === 0) {
      console.log(`No stale holds found older than ${days} days.`);
    } else {
      console.log(`✓ Cancelled ${result.length} hold(s) older than ${days} days:`);
      result.forEach(h => console.log(`   — ISBN ${h.isbn}, user ${h.userId}, created ${h.createdAt?.toLocaleDateString()}`));
    }
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });