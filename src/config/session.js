import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { pool } from './postgres.js';
import { config } from './env.js';

const PgSessionStore = pgSession(session);

const sessionConfig = {
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    store: new PgSessionStore({
        pool: pool,
        tableName: 'sessions',
        createTableIfMissing: true,
        ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
    },
    name: 'sessionId',
};


// In production
if (config.nodeEnv === 'production') {
    sessionConfig.cookie.secure = true;
}

export default session(sessionConfig);
