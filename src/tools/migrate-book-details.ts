import { Pool } from 'pg';
import { config } from '../config/env.js';

const pool = new Pool({
  host: config.postgresdb.host,
  port: Number(config.postgresdb.port),
  database: config.postgresdb.name,
  user: config.postgresdb.user,
  password: config.postgresdb.password,
});

const statements = [
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS publisher VARCHAR(255) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS creation_date VARCHAR(100) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS edition VARCHAR(255) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS language VARCHAR(255) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS physical_description TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS subjects TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS contents TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS series TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS source VARCHAR(255) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS book_type VARCHAR(100) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS mms_id VARCHAR(100) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS nz_mms_id VARCHAR(100) NOT NULL DEFAULT ''`,
  `ALTER TABLE books
     ADD COLUMN IF NOT EXISTS identifier TEXT NOT NULL DEFAULT ''`,
];

async function runMigration() {
  console.log('Applying book metadata migration...');

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log('Book metadata migration complete.');
}

runMigration()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
