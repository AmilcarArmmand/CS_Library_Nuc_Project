import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../db/mongo/models/index.js';

import { config } from './env.js';


/* Google OAuth Strategy */
passport.use(new GoogleStrategy({
    clientID: config.oauth.googleClientId,
    clientSecret: config.oauth.googleClientSecret,
    callbackURL: config.oauth.googleCallbackURL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        /* Check if user exists in database */
        let existingUser = await User.findByGoogleId(profile.id);

        if (existingUser) {
            // Update last login
            await existingUser.updateLastLogin();
            console.log('Existing user logged in:', existingUser.email);
            return done(null, existingUser);
        }

        /* Create new user in database */
        const newUser = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            profilePicture: profile.photos?.[0]?.value || null,
            lastLoginAt: new Date(),
            loginCount: 1
        });

        const savedUser = await newUser.save();
        console.log('New user created:', savedUser.email);
        return done(null, savedUser);

    } catch (error) {
        console.error('Authentication error:', error);
        return done(error, null);
    }
}));


/* Serialize only user ID to session */
passport.serializeUser((user, done) => {
    done(null, user._id);
});


/* Deserialize by fetching user from database */
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
