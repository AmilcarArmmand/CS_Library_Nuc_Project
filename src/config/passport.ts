import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { users } from '../db/schema/schema.js';
import { eq, or } from 'drizzle-orm';
import { config } from './env.js';

const isConfiguredOAuthValue = (value: string | undefined): boolean => {
  const trimmed = value?.trim();
  return Boolean(trimmed && !/^your_.+_here$/i.test(trimmed));
};

const hasGoogleAuth = isConfiguredOAuthValue(process.env['GOOGLE_CLIENT_ID'])
  && isConfiguredOAuthValue(process.env['GOOGLE_CLIENT_SECRET']);
const hasMicrosoftAuth = isConfiguredOAuthValue(process.env['MICROSOFT_CLIENT_ID'])
  && isConfiguredOAuthValue(process.env['MICROSOFT_CLIENT_SECRET']);

export const authProviders = {
  local: true,
  google: hasGoogleAuth,
  microsoft: hasMicrosoftAuth,
};

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
        microsoftId:   users.microsoftId,
        passwordHash:  users.passwordHash,
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

if (hasGoogleAuth) {
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
          .values({ googleId, email, name, picture, active: true, lastLogin: new Date() })
          .returning();

        return done(null, newUser as Express.User);

      } catch (err) {
        return done(err as Error);
      }
    }
  ));
} else {
  console.warn('[Auth] Google OAuth disabled: missing or placeholder GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
}

// MICROSOFT (OUTLOOK) OAUTH STRATEGY

function getMicrosoftEmail(profile: any): string {
  const candidates = [
    profile?.emails?.[0]?.value,
    profile?._json?.mail,
    profile?._json?.userPrincipalName,
    profile?._json?.preferred_username,
    profile?._json?.upn,
    profile?.username,
  ];

  for (const value of candidates) {
    const email = String(value ?? '').trim().toLowerCase();
    if (email) {
      return email;
    }
  }

  return '';
}

function getMicrosoftId(profile: any): string {
  const candidates = [
    profile?.id,
    profile?._json?.id,
    profile?._json?.oid,
    profile?._json?.sub,
  ];

  for (const value of candidates) {
    const microsoftId = String(value ?? '').trim();
    if (microsoftId) {
      return microsoftId;
    }
  }

  return '';
}

function normalizeStudentId(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, '').toUpperCase();
}

function getMicrosoftStudentId(profile: any): string | null {
  const candidates = [
    profile?._json?.employeeId,
    profile?._json?.employeeid,
    profile?._json?.employeeNumber,
    profile?._json?.extension_employeeId,
  ];

  for (const value of candidates) {
    const studentId = normalizeStudentId(value);
    if (/^[A-Z0-9]{5,16}$/.test(studentId)) {
      return studentId;
    }
  }

  return null;
}

if (hasMicrosoftAuth) {
  passport.use(new MicrosoftStrategy(
    {
      clientID:     process.env['MICROSOFT_CLIENT_ID']!,
      clientSecret: process.env['MICROSOFT_CLIENT_SECRET']!,
      callbackURL:  config.oauth.microsoftCallbackURL,
      scope:        ['openid', 'profile', 'email', 'User.Read'],
      tenant:       config.oauth.microsoftTenantId,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Fetch extended profile from Graph — passport-microsoft does not
        // include employeeId in the profile object by default
        let graphEmail: string | null = null;
        let graphName:  string | null = null;
        let graphStudentId: string | null = null;

        try {
          // WHERE THE MAGIC HAPPENS! Thanks to Microsoft Graph, we can get more 
          // reliable email and employeeId data than what passport-microsoft provides.
          // https://learn.microsoft.com/en-us/graph/overview

          // For future maintainers: 
          // You can still use this especially if you ever actually end up 
          // creating an app registration via the Azure portal.
          const graphRes = await fetch(
            'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,employeeId',
            { headers: { Authorization: `Bearer ${_accessToken}` } }
          );
          const graphData = await graphRes.json() as {
            displayName?: string;
            mail?: string;
            employeeId?: string;
          };

          graphEmail     = graphData.mail?.toLowerCase().trim() ?? null;
          graphName      = graphData.displayName ?? null;
          // employeeId -> studentId after normalization (remove spaces, uppercase)
          const rawId    = normalizeStudentId(graphData.employeeId ?? '');
          graphStudentId = /^[A-Z0-9]{5,16}$/.test(rawId) ? rawId : null;

        } catch (graphErr) {
          console.warn('[Auth] Graph fetch failed, falling back to profile data:', graphErr);
        }

        // Use Graph data with fallback to passport-microsoft profile
        const microsoftId = getMicrosoftId(profile);
        const email       = graphEmail ?? getMicrosoftEmail(profile);
        // Use what the graph returned. Fallback if the graph fails.
        const studentId   = graphStudentId ?? getMicrosoftStudentId(profile);
        const name        = graphName ?? profile.displayName ?? email;

        if (!email) return done(new Error('Microsoft account has no email address'));

        let [user] = microsoftId
          ? await db.select().from(users).where(eq(users.microsoftId, microsoftId)).limit(1)
          : [];

        if (user) {
          const updates: Record<string, unknown> = {
            lastLogin: new Date(),
            updatedAt: new Date(),
          };
          if (studentId && user.studentId !== studentId) {
            updates.studentId = studentId;
          }
          if (!user.microsoftId && microsoftId) updates.microsoftId = microsoftId;
          await db.update(users).set(updates).where(eq(users.id, user.id));
          return done(null, { ...user, ...updates } as Express.User);
        }

        const lookupConditions = [eq(users.email, email)];
        if (studentId) {
          lookupConditions.push(eq(users.studentId, studentId));
        }

        [user] = await db.select().from(users).where(or(...lookupConditions)).limit(1);
        if (user) {
          const updates: Record<string, unknown> = {
            microsoftId: microsoftId || user.microsoftId,
            lastLogin: new Date(),
            updatedAt: new Date(),
          };
          if (studentId && user.studentId !== studentId) {
            updates.studentId = studentId;
          }
          await db.update(users).set(updates).where(eq(users.id, user.id));
          return done(null, { ...user, ...updates } as Express.User);
        }

        const [newUser] = await db.insert(users).values({
          email,
          name,
          studentId,
          microsoftId: microsoftId || null,
          active: true,
          lastLogin: new Date(),
        }).returning();
        // Flags as a new account so the callback can show the password prompt
        (newUser as any)._isNewOAuthAccount = true;
        return done(null, newUser as Express.User);
      } catch (err) {
        return done(err as Error);
      }
    }
  ));
} else {
  console.warn('[Auth] Microsoft OAuth disabled: missing MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET');
}

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
        return done(null, false, { message: 'This account uses single sign-on.' });
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
