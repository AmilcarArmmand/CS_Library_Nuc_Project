import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from '../config/passport.js';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { users } from '../db/schema/schema.js';
import { eq } from 'drizzle-orm';

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

const router = express.Router();

// VALIDATION HELPERS

function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function isValidStudentId(id: string): boolean {
  return /^[A-Z0-9]{5,16}$/.test(id);
}

// Google OAuth login route

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login?error=google_failed' }),
  (req: Request, res: Response) => {
    console.log(`[Auth] Google login: ${(req.user as any)?.email}`);
    const redirectTo = req.session['returnTo'] ?? '/web-dashboard';
    delete req.session['returnTo'];
    res.redirect(redirectTo);
  }
);

// LOGIN

router.get('/login', (req: Request, res: Response) => {
  if (req.isAuthenticated()) return res.redirect('/web-dashboard');

  res.render('pages/login', {
    title:   'Sign In — CS Library',
    error:   req.query['error']   ?? null,
    message: req.query['message'] ?? null,
  });
});

router.post('/login',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.render('pages/login', {
          title:   'Sign In — CS Library',
          error:   info?.message ?? 'Login failed.',
          message: null,
        });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        console.log(`[Auth] Local login: ${user.email}`);
        const redirectTo = req.session['returnTo'] ?? '/web-dashboard';
        delete req.session['returnTo'];
        res.redirect(redirectTo);
      });
    })(req, res, next);
  }
);

// REGISTER

router.get('/register', (req: Request, res: Response) => {
  if (req.isAuthenticated()) return res.redirect('/web-dashboard');

  res.render('pages/register', {
    title:  'Create Account — CS Library',
    error:  null,
    fields: {},
  });
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const renderError = (error: string) => res.render('pages/register', {
    title:  'Create Account — CS Library',
    error,
    fields: {
      name:      req.body.name,
      email:     req.body.email,
      studentId: req.body.studentId,
    },
  });

  try {
    const name      = String(req.body.name      ?? '').trim();
    const email     = String(req.body.email     ?? '').trim().toLowerCase();
    const studentId = normalizeStudentId(String(req.body.studentId ?? ''));
    const password  = String(req.body.password  ?? '');
    const confirm   = String(req.body.confirm   ?? '');
 
    if (!name || !email || !studentId || !password) {
      return renderError('All fields are required.');
    }
    if (!isValidStudentId(studentId)) {
      return renderError('Student ID must be 5–16 alphanumeric characters.');
    }
    if (password.length < 8) {
      return renderError('Password must be at least 8 characters.');
    }
    if (password !== confirm) {
      return renderError('Passwords do not match.');
    }
 
    // Check for existing email
    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
 
    if (existingEmail) {
      return renderError('That email is already registered.');
    }
 
    // Check for existing student ID
    const [existingStudent] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.studentId, studentId))
      .limit(1);
 
    if (existingStudent) {
      return renderError('That Student ID is already registered.');
    }
 
    const passwordHash = await bcrypt.hash(password, 12);
 
    const [newUser] = await db
      .insert(users)
      .values({ name, email, studentId, passwordHash, active: true })
      .returning({ id: users.id });
 
    if (!newUser) return renderError('Registration failed. Please try again.');
    console.log(`[Auth] New account registered: ${email}`);
 
    const [user] = await db.select().from(users).where(eq(users.id, newUser.id)).limit(1);
    if (!user) return renderError('Registration failed. Please try again.');
 
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/web-dashboard');
    });
 
  } catch (err) {
    next(err);
  }
});

// LOGOUT

router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  const email = (req.user as any)?.email ?? 'unknown';
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      console.log(`[Auth] Logged out: ${email}`);
      res.redirect('/auth/login?message=logged_out');
    });
  });
});

export default router;