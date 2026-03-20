import session from 'express-session';
import MongoStore from 'connect-mongo';
import { config } from './env.js';

// In production, connect to use a store like MongoDB or Redis
if (config.nodeEnv === 'production') {
    sessionConfig.cookie.secure = true;
}

const sessionConfig = session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: config.mongodb.uri,
        dbName: config.mongodb.dbName,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'native',
    }),
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
    },
    name: 'sessionId',
});

export default sessionConfig;
