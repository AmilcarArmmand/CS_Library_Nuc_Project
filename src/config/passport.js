import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from './postgres.js';
import { users } from '../db/postgres/schema/index.ts';
import { eq } from 'drizzle-orm';
import { config } from './env.js';


// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: config.oauth.googleClientId,
    clientSecret: config.oauth.googleClientSecret,
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists in PostgreSQL
        let existingUser = await db.query.users.findFirst({
            where: eq(users.googleId, profile.id)
        });

        if (existingUser) {
            // Update last login
            await db.update(users).set({
                lastLogin: new Date(),
                loginCount: (existingUser.loginCount || 0) + 1,
                updatedAt: new Date()
            }).where(eq(users.googleId, profile.id));

            console.log('🔐 Existing user logged in:', existingUser.email);
            return done(null, existingUser);
        }

        // Create new user in PostgreSQL
        const [newUser] = await db.insert(users).values({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            picture: profile.photos?.[0]?.value || null,
            role: 'user',
            isActive: true,
            lastLogin: new Date(),
            loginCount: 1
        }).returning();

        console.log('✅ PostgreSQL user created:', newUser.email);
        return done(null, newUser);

    } catch (error) {
        console.error('❌ Authentication error:', error);
        return done(error, null);
    }
}));

// Serialize user ID to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize by fetching from PostgreSQL
passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, id)
        });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
