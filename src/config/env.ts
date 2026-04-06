import dotenv from 'dotenv';

dotenv.config();

interface Env {
    PORT: number | string;
    NODE_ENV: string;
    DB_URL: string;
    googleClientId: string;
    googleClientSecret: string;
    googleCallbackURL: string;
    EMAIL_HOST: string;
    EMAIL_PORT: number;
    EMAIL_USER: string;
    EMAIL_PASS: string;
    EMAIL_FROM: string;
    SESSION_SECRET: string;
}

const config = (): Env => {
  return {
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_URL: process.env.DB_URL ? process.env.DB_URL : "value_not_provided",
    googleClientId: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID : "value_not_provided",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET : "value_not_provided",
    googleCallbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.example.com',
    EMAIL_PORT: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    EMAIL_USER: process.env.EMAIL_USER ? process.env.EMAIL_USER : "value_not_provided",
    EMAIL_PASS: process.env.EMAIL_PASS ? process.env.EMAIL_PASS : "value_not_provided",
    EMAIL_FROM: process.env.EMAIL_FROM ? process.env.EMAIL_FROM : "value_not_provided",
    SESSION_SECRET: process.env.SESSION_SECRET ? process.env.SESSION_SECRET : "value_not_provided",
  };
};

export default config;
