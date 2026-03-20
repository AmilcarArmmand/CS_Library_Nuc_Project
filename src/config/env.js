import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // MongoDB
    mongodb: {
        uri: process.env.MONGODB_URL,
        name: process.env.MONGO_DB_NAME || 'team-project-db',
    },
    
    // PostgreSQL
    postgresdb: {
        url: process.env.PGSQL_URL,
    },

    oauth: {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        googleCallbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },

    session: {
        secret: process.env.SESSION_SECRET
    },

    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM
    }
};


// Validation function
export const validateConfig = () => {
    const required = [
        { key: 'mongodb.uri', value: config.mongodb.uri, name: 'MONGODB_URL' },
        { key: 'postgres.url', value: config.postgresdb.url, name: 'PGSQL_URL' },
        { key: 'google.clientId', value: config.oauth.googleClientId, name: 'GOOGLE_CLIENT_ID' },
        { key: 'google.clientSecret', value: config.oauth.googleClientSecret, name: 'GOOGLE_CLIENT_SECRET' },
        { key: 'session.secret', value: config.session.secret, name: 'SESSION_SECRET' },
    ];

    const missing = required.filter(item => !item.value);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(item => {
            console.error(`   - ${item.name}`);
        });
        
        if (config.nodeEnv === 'production') {
            process.exit(1);
        } else {
            console.warn('⚠️  Running in development mode with missing variables');
        }
    }

    return missing.length === 0;
};

export default config;
