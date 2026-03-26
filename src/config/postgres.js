import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from './env.js';
import { schema } from '../db/postgres/schema/schema.js';


const options = {
    host: config.postgresdb.host || 'localhost',
    port: config.postgresdb.port || 5432,
    database: config.postgresdb.name || 'librarydb',
    user: config.postgresdb.user || 'postgres',
    password: config.postgresdb.password,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};


export const pool = new Pool(options);

// Initialize Drizzle ORM with schema
export const db = drizzle(pool, { schema });

// Connection status tracking
let isConnected = false;

export const connectDatabasePgsql = async () => {
    if (isConnected) {
        console.log('📁 PostgreSQL already connected');
        return;
    }

    try {
        // Test connection
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();

        isConnected = true;
        console.log('📁 PostgreSQL Connected');
        console.log(`📊 Database: ${options.database}`);

        // Handle connection events
        pool.on('error', (err) => {
            console.error('❌ PostgreSQL pool error:', err);
            isConnected = false;
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await pool.end();
            console.log('📁 PostgreSQL connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        process.exit(1);
    }
};

export const getConnectionStatusPgsql = () => isConnected;

export default { db, pool };
