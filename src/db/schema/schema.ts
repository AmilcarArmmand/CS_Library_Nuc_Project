// src/db/schema/schema.ts
// Core PostgreSQL schema for the CS Library system.
// Supports local accounts, optional OAuth identity links, catalog records,
// circulation workflows, holds, donations, suggestions, and renewal requests.

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
// google_id / microsoft_id are null unless the account has been linked to that provider.

export const users = pgTable('users', {
  id:               serial('id').primaryKey(),
  studentId:        varchar('student_id', { length: 16 }).unique(),
  name:             varchar('name', { length: 255 }).notNull(),
  email:            varchar('email', { length: 255 }).unique().notNull(),
  passwordHash:     text('password_hash'),                      // null for Google users
  googleId:         varchar('google_id', { length: 255 }).unique(), // null for local users
  microsoftId:      varchar('microsoft_id', { length: 255 }).unique(),
  picture:          varchar('picture', { length: 500 }),
  role:             varchar('role', { length: 50 }).notNull().default('user'),
  active:           boolean('active').notNull().default(true),
  borrowingLimit:   integer('borrowing_limit').notNull().default(5),
  lastLogin:        timestamp('last_login', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxEmail:     index('idx_users_email').on(table.email),
  idxStudentId: index('idx_users_student_id').on(table.studentId),
  idxGoogleId:  index('idx_users_google_id').on(table.googleId),
  idxMicrosoftId: index('idx_users_microsoft_id').on(table.microsoftId),
}));

// BOOKS TABLE

// isbn is the primary key — can be ISBN-10 or ISBN-13 (normalized, no dashes).
// cover stores either a remote URL or a local /assets/covers/{isbn}.jpg path.
// status: 'Available' | 'Checked Out' | 'On Hold'

export const books = pgTable('books', {
  isbn:                varchar('isbn', { length: 20 }).primaryKey(),
  title:               varchar('title', { length: 500 }).notNull(),
  author:              varchar('author', { length: 255 }).notNull(),
  publisher:           varchar('publisher', { length: 255 }).notNull().default(''),
  creationDate:        varchar('creation_date', { length: 100 }).notNull().default(''),
  edition:             varchar('edition', { length: 255 }).notNull().default(''),
  language:            varchar('language', { length: 255 }).notNull().default(''),
  physicalDescription: text('physical_description').notNull().default(''),
  subjects:            text('subjects').notNull().default(''),
  contents:            text('contents').notNull().default(''),
  description:         text('description').notNull().default(''),
  series:              text('series').notNull().default(''),
  source:              varchar('source', { length: 255 }).notNull().default(''),
  bookType:            varchar('book_type', { length: 100 }).notNull().default(''),
  mmsId:               varchar('mms_id', { length: 100 }).notNull().default(''),
  nzMmsId:             varchar('nz_mms_id', { length: 100 }).notNull().default(''),
  identifier:          text('identifier').notNull().default(''),
  cover:               text('cover').notNull().default(''),
  status:              varchar('status', { length: 20 }).notNull().default('Available'),
  shelf:               varchar('shelf', { length: 50 }).notNull().default(''),
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
  dueReminderSentAt: timestamp('due_reminder_sent_at', { withTimezone: true }),
  overdueNoticeSentAt: timestamp('overdue_notice_sent_at', { withTimezone: true }),
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

// SUGGESTIONS TABLE

// Students can suggest books they'd like to see in the library.
// status: 'pending' | 'approved' | 'rejected'

export const suggestions = pgTable('suggestions', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').notNull().references(() => users.id),
  title:     varchar('title', { length: 500 }).notNull(),
  author:    varchar('author', { length: 255 }).notNull().default(''),
  reason:    text('reason').notNull().default(''),
  status:    varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  user: one(users, { fields: [suggestions.userId], references: [users.id] }),
}));

// DONATIONS TABLE

export const donations = pgTable('donations', {
  id:          serial('id').primaryKey(),
  donorUserId: integer('donor_user_id').references(() => users.id),
  donorName:   varchar('donor_name', { length: 255 }),
  donorEmail:  varchar('donor_email', { length: 255 }),
  isbn:        varchar('isbn', { length: 20 }).notNull(),
  title:       varchar('title', { length: 500 }).notNull(),
  author:      varchar('author', { length: 255 }).notNull().default('Unknown Author'),
  status:      varchar('status', { length: 20 }).notNull().default('pending'),
  reviewedAt:  timestamp('reviewed_at', { withTimezone: true }),
  reviewedByUserId: integer('reviewed_by_user_id').references(() => users.id),
  reviewNote:  text('review_note').notNull().default(''),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxDonorUserId: index('idx_donations_donor_user_id').on(table.donorUserId),
  idxCreatedAt:   index('idx_donations_created_at').on(table.createdAt),
  idxIsbn:        index('idx_donations_isbn').on(table.isbn),
  idxStatus:      index('idx_donations_status').on(table.status),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  donor: one(users, { fields: [donations.donorUserId], references: [users.id] }),
  reviewer: one(users, { fields: [donations.reviewedByUserId], references: [users.id] }),
}));

// RENEWAL REQUESTS TABLE

// status: 'pending' | 'approved' | 'rejected'

export const renewalRequests = pgTable('renewal_requests', {
  id:          serial('id').primaryKey(),
  loanId:      integer('loan_id').notNull().references(() => loans.id),
  userId:      integer('user_id').notNull().references(() => users.id),
  status:      varchar('status', { length: 20 }).notNull().default('pending'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt:  timestamp('reviewed_at', { withTimezone: true }),
  reviewedByUserId: integer('reviewed_by_user_id').references(() => users.id),
}, (table) => ({
  idxLoanStatus: index('idx_renewal_requests_loan_status').on(table.loanId, table.status),
  idxUserRequestedAt: index('idx_renewal_requests_user_requested_at').on(table.userId, table.requestedAt),
}));

export const renewalRequestsRelations = relations(renewalRequests, ({ one }) => ({
  loan: one(loans, { fields: [renewalRequests.loanId], references: [loans.id] }),
  user: one(users, { fields: [renewalRequests.userId], references: [users.id] }),
  reviewer: one(users, { fields: [renewalRequests.reviewedByUserId], references: [users.id] }),
}));

// PASSWORD RESET TOKENS TABLE

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt:    timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxUserId:    index('idx_password_reset_tokens_user_id').on(table.userId),
  idxExpiresAt: index('idx_password_reset_tokens_expires_at').on(table.expiresAt),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

// EQUIPMENT TABLE

// Represents a type/model of equipment available for loan.
// e.g. "Blue Yeti Microphone" — one row regardless of how many physical units exist.
// loan_duration_days overrides any system default for this item type.

export const equipment = pgTable('equipment', {
  id:              serial('id').primaryKey(),
  name:            varchar('name', { length: 255 }).notNull(),
  description:     text('description').notNull().default(''),
  category:        varchar('category', { length: 100 }).notNull().default(''),
  image:           text('image').notNull().default(''),
  loanDurationDays: integer('loan_duration_days').notNull().default(7),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxCategory: index('idx_equipment_category').on(table.category),
  idxName:     index('idx_equipment_name').on(table.name),
}));

// EQUIPMENT UNITS TABLE

// Represents an individual physical item — one row per barcode label.
// e.g. four microphones = four rows here, all pointing to the same equipment_id.
// barcode is what the scanner reads at the kiosk. It is whatever the admin
// labels the item with (asset tags, printed QR codes, etc.).
// status: 'Available' | 'Checked Out' | 'Maintenance' | 'Retired'
// condition: 'Good' | 'Fair' | 'Poor'

export const equipmentUnits = pgTable('equipment_units', {
  id:          serial('id').primaryKey(),
  equipmentId: integer('equipment_id').notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  barcode:     varchar('barcode', { length: 100 }).notNull(),
  condition:   varchar('condition', { length: 50 }).notNull().default('Good'),
  status:      varchar('status', { length: 50 }).notNull().default('Available'),
  notes:       text('notes').notNull().default(''),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxBarcode:      index('idx_equipment_units_barcode').on(table.barcode),
  idxEquipmentId:  index('idx_equipment_units_equipment_id').on(table.equipmentId),
  idxStatus:       index('idx_equipment_units_status').on(table.status),
}));

// EQUIPMENT LOANS TABLE

// One row per checkout event for a physical unit.
// The one-per-user rule (a user may not have two active loans for the same
// equipment type) is enforced at the application layer before insert.

export const equipmentLoans = pgTable('equipment_loans', {
  id:                    serial('id').primaryKey(),
  userId:                integer('user_id').notNull().references(() => users.id),
  unitId:                integer('unit_id').notNull().references(() => equipmentUnits.id),
  checkedOut:            timestamp('checked_out', { withTimezone: true }).defaultNow().notNull(),
  dueDate:               timestamp('due_date', { withTimezone: true }).notNull(),
  returned:              boolean('returned').notNull().default(false),
  returnedDate:          timestamp('returned_date', { withTimezone: true }),
  dueReminderSentAt:     timestamp('due_reminder_sent_at', { withTimezone: true }),
  overdueNoticeSentAt:   timestamp('overdue_notice_sent_at', { withTimezone: true }),
}, (table) => ({
  idxUserCheckedOut: index('idx_equipment_loans_user_checked_out').on(table.userId, table.checkedOut),
  idxUnitReturned:   index('idx_equipment_loans_unit_returned').on(table.unitId, table.returned),
}));

// EQUIPMENT RELATIONS

export const equipmentRelations = relations(equipment, ({ many }) => ({
  units: many(equipmentUnits),
}));

export const equipmentUnitsRelations = relations(equipmentUnits, ({ one, many }) => ({
  equipment: one(equipment, { fields: [equipmentUnits.equipmentId], references: [equipment.id] }),
  loans:     many(equipmentLoans),
}));

export const equipmentLoansRelations = relations(equipmentLoans, ({ one }) => ({
  user: one(users,          { fields: [equipmentLoans.userId],  references: [users.id] }),
  unit: one(equipmentUnits, { fields: [equipmentLoans.unitId],  references: [equipmentUnits.id] }),
}));

// TYPE EXPORTS

export type User       = typeof users.$inferSelect;
export type NewUser    = typeof users.$inferInsert;
export type Book       = typeof books.$inferSelect;
export type NewBook    = typeof books.$inferInsert;
export type Loan       = typeof loans.$inferSelect;
export type Hold       = typeof holds.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;
export type Donation   = typeof donations.$inferSelect;
export type RenewalRequest = typeof renewalRequests.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Equipment      = typeof equipment.$inferSelect;
export type NewEquipment   = typeof equipment.$inferInsert;
export type EquipmentUnit  = typeof equipmentUnits.$inferSelect;
export type NewEquipmentUnit = typeof equipmentUnits.$inferInsert;
export type EquipmentLoan  = typeof equipmentLoans.$inferSelect;
