// Admin panel — accessible only to users with role = 'admin'.
// Mounted at /admin in app.ts.
//
// Has its own login page at /admin/login that is separate from the
// main web app login. Only users with role = 'admin' can log in here.
// Regular users are told they are not authorized.

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from '../config/passport.js';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { users, books, loans } from '../db/schema/schema.js';
import { eq, count } from 'drizzle-orm';

const router = express.Router();

// GET /admin/login

router.get('/login', (req: Request, res: Response) => {
  // Already logged in as admin — go straight to dashboard
  if (req.isAuthenticated() && (req.user as any)?.role === 'admin') {
    res.redirect('/admin');
    return;
  }
  res.render('pages/admin/login', {
    title: 'Admin Login — CS Library',
    error: null,
  });
});

// POST /admin/login
// Uses the same Passport local strategy as the main login, but only
// allows through if the authenticated user has role = 'admin'.

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) return next(err);

    // Wrong email or password
    if (!user) {
      return res.render('pages/admin/login', {
        title: 'Admin Login — CS Library',
        error: info?.message ?? 'Login failed.',
      });
    }

    // Correct credentials but not an admin
    if (user.role !== 'admin') {
      return res.render('pages/admin/login', {
        title: 'Admin Login — CS Library',
        error: 'You are not authorized to access the admin panel.',
      });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      console.log(`[Admin] Login: ${user.email}`);
      res.redirect('/admin');
    });
  })(req, res, next);
});

// GET /admin/logout

router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  const email = (req.user as any)?.email ?? 'unknown';
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      console.log(`[Admin] Logged out: ${email}`);
      res.redirect('/admin/login');
    });
  });
});

// All routes below require admin role
// requireAdmin handles the redirect/403 for non-admins.

router.use(requireAdmin);

// GET /admin — Dashboard

router.get('/', async (req: Request, res: Response) => {
  const [[userCount], [bookCount], [loanCount]] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(books),
    db.select({ count: count() }).from(loans).where(eq(loans.returned, false)),
  ]);

  res.render('pages/admin/dashboard', {
    title: 'Admin — CS Library',
    admin: req.user,
    stats: {
      users:       userCount?.count ?? 0,
      books:       bookCount?.count ?? 0,
      activeLoans: loanCount?.count ?? 0,
    },
  });
});

export default router;