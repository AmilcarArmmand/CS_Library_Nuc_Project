import { execSync } from "child_process";

export default async function () {
  // Check if Docker is available
  try {
    execSync("docker info", { stdio: "ignore" });
  } catch {
    console.log("⚠️  Docker not available — skipping test database setup");
    return;
  }

  const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { Pool } = await import("pg");

  // start testcontainers (explicit image required due to library bug)
  const postgres = await new PostgreSqlContainer("postgres:18").start();

  // override environment variables
  const dbUrl = postgres.getConnectionUri();
  process.env.DB_URL = dbUrl;
  console.log(`Override DB_URL: ${dbUrl}`);

  // migrate DB schema
  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "drizzle" });
  await pool.end();
}