import { sql } from 'drizzle-orm';
import { db } from '../db/database.js';

async function run(): Promise<void> {
  console.log('Applying Microsoft auth migration...');

  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS microsoft_id varchar(255)
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_microsoft_id
    ON users (microsoft_id)
  `);

  console.log('Microsoft auth migration complete.');
}

run().catch((error) => {
  console.error('Microsoft auth migration failed.');
  console.error(error);
  process.exit(1);
});
