import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env directly — drizzle-kit runs as CJS and you cannot import it!
// ES module files like src/config/env.ts
dotenv.config();

const url = process.env["DATABASE_URL"]
  ?? `postgresql://${process.env["POSTGRES_USER"]}:${process.env["POSTGRES_PASSWORD"]}@${process.env["POSTGRES_HOST"]}:${process.env["POSTGRES_PORT"]}/${process.env["POSTGRES_DB"]}`;

export default defineConfig({
  out:     "./drizzle",
  dialect: "postgresql",
  schema:  "./src/db/schema/schema.ts",

  dbCredentials: { url },

  migrations: {
    prefix: "timestamp",
    table:  "__drizzle_migrations__",
    schema: "public",
  },

  breakpoints: true,
  verbose:     true,
  strict:      false,
});