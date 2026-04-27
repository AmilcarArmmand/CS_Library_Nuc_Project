import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
dotenv.config();

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number): number => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    trustProxy: parseBoolean(process.env.TRUST_PROXY, process.env.NODE_ENV === 'production'),
    app: {
        baseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
    },

    oauth: {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        googleCallbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
        microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        microsoftCallbackURL: process.env.MICROSOFT_CALLBACK_URL || '/auth/outlook/callback',
        microsoftTenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    },

    session: {
        secret: process.env.SESSION_SECRET,
        cookieSecure: parseBoolean(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === 'production')
    },

    postgresdb: {
        url: `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        name: process.env.POSTGRES_DB || 'library_db',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD
    },

    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM,
        fromName: process.env.EMAIL_FROM_NAME || 'CS Library',
        sendmailPath: process.env.EMAIL_SENDMAIL_PATH || '/usr/sbin/sendmail',
        dueReminderDays: parseNumber(process.env.DUE_REMINDER_DAYS, 2)
    },

    auth: {
        passwordResetTokenTtlMinutes: parseNumber(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 60)
    }
};


// Validation function
export const validateConfig = () => {
    const required = [
        { key: 'session.secret', value: config.session.secret, name: 'SESSION_SECRET' },
        { key: 'postgres.host', value: config.postgresdb.host, name: 'POSTGRES_HOST' },
        { key: 'postgres.port', value: String(config.postgresdb.port), name: 'POSTGRES_PORT' },
        { key: 'postgres.name', value: config.postgresdb.name, name: 'POSTGRES_DB' },
        { key: 'postgres.user', value: config.postgresdb.user, name: 'POSTGRES_USER' },
        { key: 'postgres.password', value: config.postgresdb.password, name: 'POSTGRES_PASSWORD' },
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
