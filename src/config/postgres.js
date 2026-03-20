import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from './env.js';

const pool = new Pool({
    connectionString: config.postgresdb.url,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);

let isPostgresConnected = false;

export const connectPostgres = async () => {
    if (isPostgresConnected) {
        console.log('📘 PostgreSQL already connected');
        return;
    }

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();

        isPostgresConnected = true;
        console.log(`📘 PostgreSQL Connected`);
        console.log(`📘 Database: ${config.postgresdb.url?.split('/').pop()?.split('?')[0] || 'librarydb'}`);
        console.log(`⏰ Server Time: ${result.rows[0].now}`);

        pool.on('error', (err) => {
            console.error('❌ PostgreSQL pool error:', err);
            isPostgresConnected = false;
        });

        process.on('SIGINT', async () => {
            await pool.end();
            console.log('📘 PostgreSQL pool closed');
        });

    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        throw error;
    }
};

export const getPostgresStatus = () => isPostgresConnected;
export { pool };

export default db;
