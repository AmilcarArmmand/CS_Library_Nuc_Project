import { defineConfig } from "drizzle-kit";
import { config } from './config/env.js';

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./db/postgres/schema",

  dbCredentials: {
        url: config.postgresdb.url
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
