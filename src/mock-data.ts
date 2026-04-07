// Database seeder file.
// Run this once after setting up the project to populate
// the database with books and test accounts.
//
// Run the following commands in order:
//
// npm run db:generate
// npm run db:migrate
// npx tsx src/mock-data.ts
//
// Safe to re-run — duplicates are skipped.

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

import { users, books } from './db/schema/schema.js';

// Connect to the database

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const db   = drizzle(pool, { schema: { users, books } });

// Pre-existing books

const BOOKS = [
  // Shelf 1
  { isbn: "0471170828",    title: "Applied Regression Analysis",            author: "Draper & Smith",        cover: "https://covers.openlibrary.org/b/isbn/0471170828-L.jpg",    status: "Available", shelf: "Shelf 1" },
  { isbn: "0517887290",    title: "Fingerprints of the Gods",               author: "Graham Hancock",         cover: "https://covers.openlibrary.org/b/isbn/0517887290-L.jpg",    status: "Available", shelf: "Shelf 1" },
  // Shelf 2
  { isbn: "9780073523262", title: "Computer Networks: A Top Down Approach", author: "Behrouz A. Forouzan",   cover: "https://covers.openlibrary.org/b/isbn/9780073523262-L.jpg",  status: "Available", shelf: "Shelf 2" },
  { isbn: "0321269675",    title: "Using UML",                              author: "Perdita Stevens",        cover: "https://covers.openlibrary.org/b/isbn/0321269675-L.jpg",    status: "Available", shelf: "Shelf 2" },
  { isbn: "9781491960202", title: "Learning Web Design",                    author: "Jennifer Robbins",       cover: "https://covers.openlibrary.org/b/isbn/9781491960202-L.jpg",  status: "Available", shelf: "Shelf 2" },
  { isbn: "9781783982141", title: "Kali Linux Network Scanning",            author: "Justin Hutchens",        cover: "https://covers.openlibrary.org/b/isbn/9781783982141-L.jpg",  status: "Available", shelf: "Shelf 2" },
  { isbn: "1590593898",    title: "Joel on Software",                       author: "Joel Spolsky",           cover: "https://covers.openlibrary.org/b/isbn/1590593898-L.jpg",    status: "Available", shelf: "Shelf 2" },
  // Shelf 3
  { isbn: "9781782163121", title: "Mastering Kali Linux",                   author: "Robert W. Beggs",        cover: "https://covers.openlibrary.org/b/isbn/9781782163121-L.jpg",  status: "Available", shelf: "Shelf 3" },
  { isbn: "0471098779",    title: "Elements of Cartography",                author: "Robinson et al.",        cover: "https://covers.openlibrary.org/b/isbn/0471098779-L.jpg",    status: "Available", shelf: "Shelf 3" },
  { isbn: "0131478230",    title: "Practical Guide to Linux",               author: "Mark G. Sobell",         cover: "https://covers.openlibrary.org/b/isbn/0131478230-L.jpg",    status: "Available", shelf: "Shelf 3" },
  { isbn: "076372677X",    title: "Information Security Illuminated",       author: "Solomon & Chapple",      cover: "https://covers.openlibrary.org/b/isbn/076372677X-L.jpg",    status: "Available", shelf: "Shelf 3" },
  { isbn: "0596005458",    title: "Security Warrior",                       author: "Peikari & Chuvakin",     cover: "https://covers.openlibrary.org/b/isbn/0596005458-L.jpg",    status: "Available", shelf: "Shelf 3" },
  // Shelf 4
  { isbn: "0030977177",    title: "World Regional Geography",               author: "Wheeler & Kostbade",     cover: "https://covers.openlibrary.org/b/id/6463996-L.jpg",         status: "Available", shelf: "Shelf 4" },
  { isbn: "0314004246",    title: "Physical Geography Manual",              author: "West Publishing",        cover: "https://covers.openlibrary.org/b/id/11145828-L.jpg",        status: "Available", shelf: "Shelf 4" },
  // Shelf 5
  { isbn: "0671492071",    title: "Alan Turing: The Enigma",                author: "Andrew Hodges",          cover: "https://covers.openlibrary.org/b/isbn/0671492071-L.jpg",    status: "Available", shelf: "Shelf 5" },
  { isbn: "0321534964",    title: "The Art of Computer Programming",        author: "Donald Knuth",           cover: "https://covers.openlibrary.org/b/isbn/0321534964-L.jpg",    status: "Available", shelf: "Shelf 5" },
] as const;

// Test Accounts
// student_id stored as a string to match the VARCHAR column.
// Passwords are hashed by this script — never stored in plain text.
// Although unnecessary since these are test accounts, change passwords before deploying to production!

const TEST_USERS = [
  { studentId: "40000", name: "Nisreen Cain",     email: "cainn3@southernct.edu", password: "changeme123" },
  { studentId: "10101", name: "Amilcar Armmand",  email: "armmanda1@southernct.edu",    password: "changeme123" },
  { studentId: "12345", name: "Kenneth Molina",  email: "molinak4@southernct.edu",    password: "changeme123" },
  { studentId: "11111", name: "Jose Gaspar",     email: "gasparmarij1@southernct.edu", password: "changeme123" },
  { studentId: "99999", name: "Professor James", email: "james@southernct.edu",         password: "changeme123" },
];

// Seed Function

async function seed() {
  console.log('Starting database seed...\n');

  // Book Provisioning

  let booksAdded   = 0;
  let booksSkipped = 0;

  for (const book of BOOKS) {
    const [existing] = await db
      .select({ isbn: books.isbn })
      .from(books)
      .where(eq(books.isbn, book.isbn))
      .limit(1);

    if (existing) {
      booksSkipped++;
      continue;
    }

    await db.insert(books).values(book);
    booksAdded++;
  }

  console.log(`  Books : ${booksAdded} added, ${booksSkipped} already existed — skipped.`);

  // User provisioning

  let usersAdded   = 0;
  let usersSkipped = 0;

  for (const { studentId, name, email, password } of TEST_USERS) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          eq(users.studentId, studentId),
          eq(users.email, email.toLowerCase()),
        )
      )
      .limit(1);

    if (existing) {
      usersSkipped++;
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      studentId,
      name,
      email:           email.toLowerCase(),
      passwordHash,
      active:          true,
    });

    usersAdded++;
  }

  console.log(`  Users : ${usersAdded} added, ${usersSkipped} already existed — skipped.`);

  // Output the summary.

  if (usersAdded > 0) {
    console.log('\n  Test account credentials:');
    console.log(`  ${'Student ID'.padEnd(12)} ${'Name'.padEnd(22)} ${'Email'.padEnd(35)} Password`);
    console.log(`  ${'-'.repeat(12)} ${'-'.repeat(22)} ${'-'.repeat(35)} ${'-'.repeat(12)}`);
    for (const { studentId, name, email, password } of TEST_USERS) {
      console.log(`  ${studentId.padEnd(12)} ${name.padEnd(22)} ${email.padEnd(35)} ${password}`);
    }
  }

  console.log('\nSeeding complete.\n');
  await pool.end();
}

seed().catch((err) => {
  console.error('SEEDING FAILED:', err);
  pool.end();
  process.exit(1);
});