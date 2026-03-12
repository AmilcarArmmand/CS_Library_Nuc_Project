import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    oauth: {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        googleCallbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },

    session: {
        secret: process.env.SESSION_SECRET
    },

    database: {
        uri: process.env.POSTGRESQL_URI,
        name: process.env.DB_NAME || 'team-project-db'
    }
};
