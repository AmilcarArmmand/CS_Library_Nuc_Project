import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';
import passport, { authProviders } from '../config/passport.js';
import bcrypt from 'bcryptjs';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { db } from '../db/database.js';
import { passwordResetTokens, users } from '../db/schema/schema.js';
import { config } from '../config/env.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const router = express.Router();
const PASSWORD_RESET_TOKEN_BYTES = 32;

function getLoginError(error: unknown): string | null {
  switch (error) {
    case 'google_failed':
      return 'Google sign-in failed. Please try again.';
    case 'google_unavailable':
      return 'Google sign-in is not available right now.';
    case 'outlook_failed':
      return 'Outlook sign-in failed. Please try again.';
    case 'outlook_unavailable':
      return 'Outlook sign-in is not available right now.';
    default:
      return typeof error === 'string' && error.length > 0 ? error : null;
  }
}

function getLoginMessage(message: unknown): string | null {
  switch (message) {
    case 'logged_out':
      return 'You have been signed out.';
    case 'password_reset_requested':
      return 'If an account exists for that email, a reset link has been sent.';
    case 'password_reset_success':
      return 'Your password has been reset. You can sign in now.';
    default:
      return typeof message === 'string' && message.length > 0 ? message : null;
  }
}

function renderLogin(res: Response, options: { error?: string | null; message?: string | null } = {}): void {
  res.render('pages/login', {
    title: 'Sign In — CS Library',
    error: options.error ?? null,
    message: options.message ?? null,
    authProviders,
  });
}

function renderRegister(res: Response, options: { error?: string | null; fields?: Record<string, unknown> } = {}): void {
  res.render('pages/register', {
    title: 'Create Account — CS Library',
    error: options.error ?? null,
    fields: options.fields ?? {},
    authProviders,
  });
}

function renderForgotPassword(res: Response, options: {
  error?: string | null;
  message?: string | null;
  email?: string | null;
} = {}): void {
  res.render('pages/forgot-password', {
    title: 'Reset Password — CS Library',
    error: options.error ?? null,
    message: options.message ?? null,
    email: options.email ?? '',
  });
}

function renderResetPassword(res: Response, options: {
  error?: string | null;
  message?: string | null;
  token?: string | null;
  tokenValid?: boolean;
} = {}): void {
  res.render('pages/reset-password', {
    title: 'Choose New Password — CS Library',
    error: options.error ?? null,
    message: options.message ?? null,
    token: options.token ?? '',
    tokenValid: options.tokenValid ?? false,
  });
}

// VALIDATION HELPERS

function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function isValidStudentId(id: string): boolean {
  return /^[A-Z0-9]{5,16}$/.test(id);
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildPasswordResetUrl(token: string): string {
  return `${config.app.baseUrl.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

async function deleteExpiredPasswordResetTokens(): Promise<void> {
  await db.delete(passwordResetTokens).where(
    and(
      isNull(passwordResetTokens.usedAt),
      lt(passwordResetTokens.expiresAt, new Date()),
    ),
  );
}

async function findValidPasswordResetToken(rawToken: string) {
  const tokenHash = hashPasswordResetToken(rawToken);
  const [tokenRecord] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
      email: users.email,
      name: users.name,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return tokenRecord ?? null;
}

// Google OAuth login route

router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  if (!authProviders.google) {
    res.redirect('/auth/login?error=google_unavailable');
    return;
  }
  next();
}, passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
  if (!authProviders.google) {
    res.redirect('/auth/login?error=google_unavailable');
    return;
  }
  next();
},
  passport.authenticate('google', { failureRedirect: '/auth/login?error=google_failed' }),
  (req: Request, res: Response) => {
    const redirectTo = req.session['returnTo'] ?? '/web-dashboard';
    delete req.session['returnTo'];
    res.redirect(redirectTo);
  }
);

// Microsoft (Outlook) OAuth routes

router.get('/outlook', (req: Request, res: Response, next: NextFunction) => {
  if (!authProviders.microsoft) {
    res.redirect('/auth/login?error=outlook_unavailable');
    return;
  }
  next();
}, passport.authenticate('microsoft', {
  prompt: 'select_account',
}));

router.get('/outlook/callback', (req: Request, res: Response, next: NextFunction) => {
  if (!authProviders.microsoft) {
    res.redirect('/auth/login?error=outlook_unavailable');
    return;
  }
  next();
},
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('microsoft', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        const msg = info?.message ?? 'outlook_failed';
        return res.redirect(`/auth/login?error=${encodeURIComponent(msg)}`);
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        // New OAuth account — offer optional password setup once
        if (user._isNewOAuthAccount) {
          return res.redirect('/auth/setup-password');
        }

        const redirectTo = req.session['returnTo'] ?? '/web-dashboard';
        delete req.session['returnTo'];
        res.redirect(redirectTo);
      });
    })(req, res, next);
  }
);

// LOGIN

router.get('/login', (req: Request, res: Response) => {
  if (req.isAuthenticated()) return res.redirect('/web-dashboard');

  renderLogin(res, {
    error: getLoginError(req.query['error']),
    message: getLoginMessage(req.query['message']),
  });
});

router.post('/login',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        renderLogin(res, {
          error: info?.message ?? 'Login failed.',
          message: null,
        });
        return;
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const redirectTo = req.session['returnTo'] ?? '/web-dashboard';
        delete req.session['returnTo'];
        res.redirect(redirectTo);
      });
    })(req, res, next);
  }
);

// PASSWORD RESET

router.get('/forgot-password', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.redirect('/web-dashboard');
    return;
  }

  renderForgotPassword(res);
});

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  const email = normalizeEmail(String(req.body.email ?? ''));

  if (!email) {
    renderForgotPassword(res, {
      error: 'Enter the email address for your account.',
      email,
    });
    return;
  }

  try {
    await deleteExpiredPasswordResetTokens();

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

      const rawToken = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
      const expiresAt = new Date(Date.now() + config.auth.passwordResetTokenTtlMinutes * 60 * 1000);

      const [tokenRecord] = await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashPasswordResetToken(rawToken),
        expiresAt,
      }).returning({ id: passwordResetTokens.id });

      const resetUrl = buildPasswordResetUrl(rawToken);
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: config.auth.passwordResetTokenTtlMinutes,
      });

      if (!emailResult.success && tokenRecord) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRecord.id));
        console.warn(`[Auth] Password reset email was not delivered for ${user.email}.`);
      }
    }

    renderForgotPassword(res, {
      message: 'If an account exists for that email, a reset link has been sent.',
      email,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    res.redirect('/web-dashboard');
    return;
  }

  const token = String(req.query['token'] ?? '').trim();
  if (!token) {
    renderResetPassword(res, {
      error: 'This password reset link is invalid or missing.',
      tokenValid: false,
    });
    return;
  }

  try {
    await deleteExpiredPasswordResetTokens();
    const tokenRecord = await findValidPasswordResetToken(token);

    renderResetPassword(res, {
      token,
      tokenValid: Boolean(tokenRecord),
      ...(tokenRecord ? {} : { error: 'This password reset link is invalid or has expired.' }),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  const token = String(req.body.token ?? '').trim();
  const password = String(req.body.password ?? '');
  const confirm = String(req.body.confirm ?? '');

  if (!token) {
    renderResetPassword(res, {
      error: 'This password reset link is invalid or missing.',
      tokenValid: false,
    });
    return;
  }

  if (!password) {
    renderResetPassword(res, {
      error: 'Enter a new password.',
      token,
      tokenValid: true,
    });
    return;
  }

  if (password.length < 8) {
    renderResetPassword(res, {
      error: 'Password must be at least 8 characters.',
      token,
      tokenValid: true,
    });
    return;
  }

  if (password !== confirm) {
    renderResetPassword(res, {
      error: 'Passwords do not match.',
      token,
      tokenValid: true,
    });
    return;
  }

  try {
    await deleteExpiredPasswordResetTokens();
    const tokenRecord = await findValidPasswordResetToken(token);

    if (!tokenRecord) {
      renderResetPassword(res, {
        error: 'This password reset link is invalid or has expired.',
        tokenValid: false,
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, tokenRecord.userId));

      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, tokenRecord.id));

      await tx.delete(passwordResetTokens).where(
        and(
          eq(passwordResetTokens.userId, tokenRecord.userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
    });

    res.redirect('/auth/login?message=password_reset_success');
  } catch (err) {
    next(err);
  }
});

// REGISTER

router.get('/register', (req: Request, res: Response) => {
  if (req.isAuthenticated()) return res.redirect('/web-dashboard');

  renderRegister(res);
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const renderError = (error: string) => renderRegister(res, {
    error,
    fields: {
      name:      req.body.name,
      email:     req.body.email,
      studentId: req.body.studentId,
    },
  });

  try {
    const name      = String(req.body.name      ?? '').trim();
    const email     = normalizeEmail(String(req.body.email     ?? ''));
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

// OPTIONAL PASSWORD SETUP (offered once after first OAuth login)

router.get('/setup-password', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.redirect('/auth/login');
  // Skip if they already have a password
  if ((req.user as any).passwordHash) return res.redirect('/web-dashboard');

  res.render('pages/setup-password', {
    title: 'Set a Password — CS Library',
    error: null,
    user:  req.user,
  });
});

router.post('/setup-password', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) return res.redirect('/auth/login');

  try {
    const user   = req.user as any;
    const action = String(req.body.action ?? '');

    // User chooses to skip — go to dashboard, never shown again.
    if (action === 'skip') {
      return res.redirect('/web-dashboard');
    }

    const password = String(req.body.password ?? '');
    const confirm  = String(req.body.confirm  ?? '');

    if (password.length < 8) {
      return res.render('pages/setup-password', {
        title: 'Set a Password — CS Library',
        error: 'Password must be at least 8 characters.',
        user,
      });
    }
    if (password !== confirm) {
      return res.render('pages/setup-password', {
        title: 'Set a Password — CS Library',
        error: 'Passwords do not match.',
        user,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    res.redirect('/web-dashboard');

  } catch (err) { next(err); }
});

// LOGOUT

router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('sessionId');
      res.redirect('/auth/login?message=logged_out');
    });
  });
});

export default router;
