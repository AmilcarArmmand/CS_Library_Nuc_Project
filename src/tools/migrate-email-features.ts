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
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS borrowing_limit INTEGER NOT NULL DEFAULT 5`,
  `ALTER TABLE loans
     ADD COLUMN IF NOT EXISTS due_reminder_sent_at TIMESTAMPTZ`,
  `ALTER TABLE loans
     ADD COLUMN IF NOT EXISTS overdue_notice_sent_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS donations (
     id SERIAL PRIMARY KEY,
     donor_user_id INTEGER REFERENCES users(id),
     donor_name VARCHAR(255),
     donor_email VARCHAR(255),
     isbn VARCHAR(20) NOT NULL,
     title VARCHAR(500) NOT NULL,
     author VARCHAR(255) NOT NULL DEFAULT 'Unknown Author',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_donations_donor_user_id
     ON donations (donor_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_donations_created_at
     ON donations (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_donations_isbn
     ON donations (isbn)`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id),
     token_hash TEXT NOT NULL,
     expires_at TIMESTAMPTZ NOT NULL,
     used_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
     ON password_reset_tokens (token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
     ON password_reset_tokens (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
     ON password_reset_tokens (expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_loans_due_reminder_pending
     ON loans (due_date)
     WHERE returned = false AND due_reminder_sent_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_loans_overdue_notice_pending
     ON loans (due_date)
     WHERE returned = false AND overdue_notice_sent_at IS NULL`,
];

async function runMigration() {
  console.log('Applying library feature migration...');

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log('Library feature migration complete.');
}

runMigration()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
