import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../db/database.js';
import { users } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { config } from './env.js';

export interface GoogleUser {
    googleId: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    accessToken: string;
    createdAt: Date;
}

declare global {
    namespace Express {
        interface User extends GoogleUser {}
    }
}

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: config.oauth.googleClientId!,
    clientSecret: config.oauth.googleClientSecret!,
    callbackURL: config.oauth.googleCallbackURL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // PHASE 1: Create user object from Google profile
        // This stores user data in session only (not database)
        const user = {
            googleId: profile.id,
            email: profile.emails?.[0]?.value ?? '',
            name: profile.displayName,
            firstName: profile.name?.givenName ?? '',
            lastName: profile.name?.familyName ?? '',
            picture: profile.photos?.[0]?.value ?? '',
            accessToken: accessToken,
            createdAt: new Date()
        };

        console.log('🔐 User authenticated:', user.email);
        return done(null, user as Express.User);
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return done(error as Error, false);
    }
}));

// PHASE 1: Serialize entire user object to session
passport.serializeUser((user, done) => {
    done(null, user);
});

// PHASE 1: Deserialize user from session
passport.deserializeUser<GoogleUser>((user, done) => {
    done(null, user);
});

export default passport;
