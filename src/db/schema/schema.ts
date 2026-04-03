// src/db/schema/schema.ts
// I did my best creating the schema based on database.py's pre-existing tables.
// This SHOULD support both Google OAuth and local email/password users.
// This is full library system (books, loans, holds).
// We would need to rework this if we manage to get SSO permissions from the school.
// Honestly though we could base it off of what the professor has for her website.


import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// USERS TABLE

// student_id is the barcode/ID card value — always uppercase, 5-16 chars.
// password_hash is null for Google-only users.
// google_id is null for local (email/password) users.

// !! IGNORE THIS, WILL REMOVE LATER !!
// auto_provisioned = true means the kiosk created the account on first scan
// and the user has not yet registered with a real name/email/password.

export const users = pgTable('users', {
  id:               serial('id').primaryKey(),
  studentId:        varchar('student_id', { length: 16 }).unique(),
  name:             varchar('name', { length: 255 }).notNull(),
  email:            varchar('email', { length: 255 }).unique().notNull(),
  passwordHash:     text('password_hash'),                      // null for Google users
  googleId:         varchar('google_id', { length: 255 }).unique(), // null for local users
  picture:          varchar('picture', { length: 500 }),
  role:             varchar('role', { length: 50 }).notNull().default('user'),
  active:           boolean('active').notNull().default(true),
  autoProvisioned:  boolean('auto_provisioned').notNull().default(false),
  lastLogin:        timestamp('last_login', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxEmail:     index('idx_users_email').on(table.email),
  idxStudentId: index('idx_users_student_id').on(table.studentId),
  idxGoogleId:  index('idx_users_google_id').on(table.googleId),
}));

// BOOKS TABLE

// isbn is the primary key — can be ISBN-10 or ISBN-13 (normalized, no dashes).
// cover stores either a remote URL or a local /assets/covers/{isbn}.jpg path.
// status: 'Available' | 'Checked Out'

export const books = pgTable('books', {
  isbn:   varchar('isbn', { length: 20 }).primaryKey(),
  title:  varchar('title', { length: 500 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  cover:  text('cover').notNull().default(''),
  status: varchar('status', { length: 20 }).notNull().default('Available'),
  shelf:  varchar('shelf', { length: 50 }).notNull().default(''),
}, (table) => ({
  idxStatus: index('idx_books_status').on(table.status),
  idxTitle:  index('idx_books_title').on(table.title),
}));

// LOANS TABLE

// One row per checkout event. returned = false means the book is still out.
// returned_date is set when the book comes back.

export const loans = pgTable('loans', {
  id:           serial('id').primaryKey(),
  userId:       integer('user_id').notNull().references(() => users.id),
  isbn:         varchar('isbn', { length: 20 }).notNull().references(() => books.isbn),
  checkedOut:   timestamp('checked_out', { withTimezone: true }).defaultNow().notNull(),
  dueDate:      timestamp('due_date', { withTimezone: true }).notNull(),
  returned:     boolean('returned').notNull().default(false),
  returnedDate: timestamp('returned_date', { withTimezone: true }),
}, (table) => ({
  idxUserCheckedOut: index('idx_loans_user_checked_out').on(table.userId, table.checkedOut),
  idxIsbnReturned:   index('idx_loans_isbn_returned').on(table.isbn, table.returned),
}));

// HOLDS TABLE

// status: 'pending' | 'ready' | 'fulfilled' | 'cancelled'

export const holds = pgTable('holds', {
  id:         serial('id').primaryKey(),
  userId:     integer('user_id').notNull().references(() => users.id),
  isbn:       varchar('isbn', { length: 20 }).notNull().references(() => books.isbn),
  status:     varchar('status', { length: 20 }).notNull().default('pending'),
  pickupDate: timestamp('pickup_date', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxIsbnStatus: index('idx_holds_isbn_status').on(table.isbn, table.status),
}));

// RELATIONS

export const usersRelations = relations(users, ({ many }) => ({
  loans: many(loans),
  holds: many(holds),
}));

export const booksRelations = relations(books, ({ many }) => ({
  loans: many(loans),
  holds: many(holds),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  user: one(users, { fields: [loans.userId], references: [users.id] }),
  book: one(books, { fields: [loans.isbn],   references: [books.isbn] }),
}));

export const holdsRelations = relations(holds, ({ one }) => ({
  user: one(users, { fields: [holds.userId], references: [users.id] }),
  book: one(books, { fields: [holds.isbn],   references: [books.isbn] }),
}));

// TYPE EXPORTS

export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Book    = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Loan    = typeof loans.$inferSelect;
export type Hold    = typeof holds.$inferSelect;