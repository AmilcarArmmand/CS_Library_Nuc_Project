import { connectMongoDB, getMongoStatus } from './mongo.js';
import { connectPostgres, getPostgresStatus } from './postgres.js';
import { validateConfig } from './env.js';

export const connectAllDatabases = async () => {
    // Validate environment variables first
    validateConfig();
    
    try {
        console.log('🔌 Connecting to databases...');
        
        // Connect to MongoDB (for users/auth)
        await connectMongoDB();
        
        // Connect to PostgreSQL (for library data)
        await connectPostgres();
        
        console.log('✅ All database connections established');
    } catch (error) {
        console.error('❌ Failed to connect to databases:', error);
        process.exit(1);
    }
};

export const getDatabaseStatus = () => ({
    mongodb: getMongoStatus(),
    postgresql: getPostgresStatus()
});

export { getMongoStatus, getPostgresStatus };
export { db as postgresDb, pool as postgresPool } from './postgres.js';
export { default as mongoose } from './mongo.js';
