import { pgTable, varchar, boolean, timestamp, integer, jsonb, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { loans } from "./loans.ts";
import { reservations } from "./reservations.ts";
import { reviews } from "./reviews.ts";

/**
 * PostgreSQL Users Table
 * Mirrors MongoDB User schema with added student_id field
 * Used for relational data operations and reporting
 */
export const users = pgTable("users", {
    // Primary Key - Auto-increment ID
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    // Google OAuth Information
    googleId: varchar("google_id", { length: 255 }).notNull().unique(),

    // Profile Information
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    picture: text("picture"),

    // Student Information (specific to PostgreSQL)
    studentId: varchar("student_id", { length: 50 }).unique(),

    // Account Settings
    role: varchar("role", { length: 20 }).notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),

    // Library-specific data (stored as JSONB for flexibility)
    preferences: jsonb("preferences").default({
        theme: "light",
        notifications: true
    }),
    stats: jsonb("stats").default({
        totalActions: 0,
        completedTasks: 0
    }),

    // Metadata
    lastLogin: timestamp("last_login").defaultNow(),
    loginCount: integer("login_count").default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define relations for users table
export const usersRelations = relations(users, ({ many }) => ({
    loans: many(loans),
    reservations: many(reservations),
    reviews: many(reviews)
}));

// Export TypeScript types
export type users = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
