import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import config from '../config/env.js';

let pool: Pool;
let dsl: NodePgDatabase<Record<string, unknown>>;

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: config().DB_URL,
    });
  }
  return pool;
};

const connectDatabase = (): NodePgDatabase<Record<string, unknown>> => {
  if (!dsl) {
    dsl = drizzle(getPool());
  }
  return dsl;
};

export default connectDatabase;
