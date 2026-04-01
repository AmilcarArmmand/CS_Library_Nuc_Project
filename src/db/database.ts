import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/schema.js';
import { config } from '../config/env.js';


const options = {
    host: config.postgresdb.host || 'localhost',
    port: Number(config.postgresdb.port) || 5432,
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

export const connectDatabase = async () => {
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ PostgreSQL connection failed:', errorMessage);
        process.exit(1);
    }
};

export const getConnectionStatus = () => isConnected;

export default { db, pool, connectDatabase, getConnectionStatus };
