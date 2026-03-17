import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./db/postgres/schema",

  dbCredentials: {
        url: process.env.DATABASE_URL,
  },


  
  
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations__",
    schema: "public",
  },

  breakpoints: true,
  verbose: true,
  strict: true,
});
