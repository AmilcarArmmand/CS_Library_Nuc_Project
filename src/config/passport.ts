import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { users } from '../db/schema/schema.js';
import { eq } from 'drizzle-orm';

// SERIALIZE AND DESERIALIZE

passport.serializeUser((user, done) => {
  done(null, (user as any).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db
      .select({
        id:            users.id,
        name:          users.name,
        email:         users.email,
        studentId:     users.studentId,
        role:          users.role,
        active:        users.active,
        picture:       users.picture,
        googleId:      users.googleId,
        passwordHash:  users.passwordHash,
        autoProvisioned: users.autoProvisioned,
        lastLogin:     users.lastLogin,
        createdAt:     users.createdAt,
        updatedAt:     users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

// GOOGLE OAUTH STRATEGY

passport.use(new GoogleStrategy(
  {
    clientID:     process.env['GOOGLE_CLIENT_ID']!,
    clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
    callbackURL:  process.env['GOOGLE_CALLBACK_URL'] ?? '/auth/google/callback',
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email    = (profile.emails?.[0]?.value ?? '').toLowerCase().trim();
      const name     = profile.displayName ?? email;
      const picture  = profile.photos?.[0]?.value ?? null;

      if (!email) return done(new Error('Google account has no email address'));

      // Find by Google ID first
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleId))
        .limit(1);

      if (user) {
        await db.update(users)
          .set({ lastLogin: new Date(), picture, updatedAt: new Date() })
          .where(eq(users.id, user.id));
        return done(null, user as Express.User);
      }

      // Find by email (link Google to existing local account)
      [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user) {
        await db.update(users)
          .set({ googleId, picture, lastLogin: new Date(), updatedAt: new Date() })
          .where(eq(users.id, user.id));
        return done(null, { ...user, googleId, picture } as Express.User);
      }

      // Create new Google user
      const [newUser] = await db
        .insert(users)
        .values({ googleId, email, name, picture, active: true, autoProvisioned: false, lastLogin: new Date() })
        .returning();

      console.log(`[Auth] New Google user: ${email}`);
      return done(null, newUser as Express.User);

    } catch (err) {
      return done(err as Error);
    }
  }
));

// LOCAL STRATEGY

passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);

      if (!user) return done(null, false, { message: 'Invalid email or password.' });
      if (!user.active) return done(null, false, { message: 'Account is disabled.' });
      if (!user.passwordHash) {
        return done(null, false, { message: 'This account uses Google Sign-In.' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return done(null, false, { message: 'Invalid email or password.' });

      await db.update(users)
        .set({ lastLogin: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));

      return done(null, user as Express.User);

    } catch (err) {
      return done(err);
    }
  }
));

export default passport;