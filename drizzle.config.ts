import { defineConfig } from "drizzle-kit";
import { config } from './src/config/env.js';

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",

  dbCredentials: {
    url: `postgresql://${config.postgresdb.user}:${config.postgresdb.password}@${config.postgresdb.host}:${config.postgresdb.port}/${config.postgresdb.name}`,
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
