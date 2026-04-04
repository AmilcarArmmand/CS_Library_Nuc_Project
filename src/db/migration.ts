import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getPool } from "./database.js";

const migrateSchema = async (dbUrl: string) => {
  const pool = getPool();
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
};

export default migrateSchema;
