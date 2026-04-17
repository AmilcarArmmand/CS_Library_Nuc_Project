// Account settings page — accessible to any logged-in user.
// Mounted at /settings in app.ts.
//
//   GET  /settings          → settings.ejs
//   POST /settings/password → set or change password

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { users } from '../db/schema/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// GET /settings

router.get('/', (req: Request, res: Response) => {
  res.render('pages/settings', {
    title:           'Account Settings — CS Library',
    user:            req.user,
    passwordError:   null,
    passwordSuccess: null,
  });
});

// POST /settings/password

router.post('/password', async (req: Request, res: Response, next: NextFunction) => {
  const user    = req.user as any;
  const current  = String(req.body.current  ?? '');
  const password = String(req.body.password ?? '');
  const confirm  = String(req.body.confirm  ?? '');

  const render = (passwordError: string | null, passwordSuccess: string | null) =>
    res.render('pages/settings', {
      title:           'Account Settings — CS Library',
      user,
      passwordError,
      passwordSuccess,
    });

  try {
    // If the account already has a password, verify it first
    if (user.passwordHash) {
      if (!current) return render('Please enter your current password.', null);
      const valid = await bcrypt.compare(current, user.passwordHash);
      if (!valid)   return render('Current password is incorrect.', null);
    }

    if (!password)           return render('Please enter a new password.', null);
    if (password.length < 8) return render('Password must be at least 8 characters.', null);
    if (password !== confirm) return render('Passwords do not match.', null);

    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // console.log(`[Settings] Password updated for: ${user.email}`);

    // Refresh the session so passwordHash reflects immediately
    (req.user as any).passwordHash = passwordHash;

    render(null, 'Password saved successfully!');

  } catch (err) {
    next(err);
  }
});

export default router;