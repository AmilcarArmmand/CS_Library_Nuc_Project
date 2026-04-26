import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { getPool } from '../db/database.js';
import config from './env.js';

const PgSessionStore = pgSession(session);

const sessionConfig: session.SessionOptions = {
    secret: config().JWT_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PgSessionStore({
        pool: getPool(),
        tableName: 'sessions',
        createTableIfMissing: config().NODE_ENV !== 'production',
        ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: config.session.cookieSecure,
        sameSite: 'lax' as const,
    },
    name: 'sessionId',
};

export default session(sessionConfig);
