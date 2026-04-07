// Promotes an existing user to admin role by email address.
//
// Usage:
// npx tsx src/tools/make-admin.ts you@example.com

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

import { users } from '../db/schema/schema.js';

const pool = new Pool({
  host:     process.env['POSTGRES_HOST'],
  port:     Number(process.env['POSTGRES_PORT'] ?? 5432),
  database: process.env['POSTGRES_DB'],
  user:     process.env['POSTGRES_USER'],
  password: process.env['POSTGRES_PASSWORD'],
});
const db = drizzle(pool);

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx src/scripts/make-admin.ts <email>');
    process.exit(1);
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`${user.name} (${user.email}) is already an admin.`);
    await pool.end();
    return;
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));
  console.log(`✅  ${user.name} (${user.email}) is now an admin.`);
  await pool.end();
}

makeAdmin().catch((err) => {
  console.error('Error:', err);
  pool.end();
  process.exit(1);
});