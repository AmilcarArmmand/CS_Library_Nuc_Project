import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // PHASE 1: Create user object from Google profile
        // This stores user data in session only (not database)
        const user = {
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value,
            accessToken: accessToken,
            createdAt: new Date()
        };

        console.log('🔐 User authenticated:', user.email);
        return done(null, user);
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return done(error, null);
    }
}));

// PHASE 1: Serialize entire user object to session
passport.serializeUser((user, done) => {
    done(null, user);  // Stores whole object - not ideal for production
});

// PHASE 1: Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);  // Returns object from session
});

export default passport;
