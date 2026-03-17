import session from 'express-session';
import { config } from './env.js';

const sessionConfig = {
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// In production, connect to use a store like MongoDB or Redis
if (config.nodeEnv === 'production') {
    sessionConfig.cookie.secure = true;
}

export default session(sessionConfig);
