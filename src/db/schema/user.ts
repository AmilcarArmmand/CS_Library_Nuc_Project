// src/db/schema/user.ts
import { 
  pgTable, 
  varchar, 
  timestamp, 
  integer, 
  uuid, 
  boolean,
  index 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  googleId: varchar('google_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  picture: varchar('picture', { length: 500 }),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  loginCount: integer('login_count').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxEmail: index('idx_users_email').on(table.email),
  idxGoogleId: index('idx_users_google_id').on(table.googleId),
  idxCreatedAt: index('idx_users_created_at').on(table.createdAt.desc()),
}));

export const usersRelations = relations(users, ({}) => ({}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
