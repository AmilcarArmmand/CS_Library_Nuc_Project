// Used to reverts a user from admin role to regular user by email address.
//
// Usage:
// npx tsx src/tools/make-user.ts you@example.com

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

async function makeUser() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx src/tools/make-user.ts <email>');
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

  if (user.role === 'user') {
    console.log(`${user.name} (${user.email}) is already a regular user.`);
    await pool.end();
    return;
  }

  await db.update(users).set({ role: 'user' }).where(eq(users.id, user.id));
  console.log(`✅  ${user.name} (${user.email}) is now a regular user.`);
  await pool.end();
}

makeUser().catch((err) => {
  console.error('Error:', err);
  pool.end();
  process.exit(1);
});
