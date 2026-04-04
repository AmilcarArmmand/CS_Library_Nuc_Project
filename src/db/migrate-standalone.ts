import config from "../config/env.js";
import migrateSchema from "./migration.js";
import { getPool } from "./database.js";

// This file suppose to be used only in package.json scripts

console.time("DRIZZLE MIGRATION");
await migrateSchema(config().DB_URL);
await getPool().end();
console.timeEnd("DRIZZLE MIGRATION");
