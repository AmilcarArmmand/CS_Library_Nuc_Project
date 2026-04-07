// Authentication middleware for protecting routes.

import type { Request, Response, NextFunction } from 'express';

// Makes req.user available in all EJS templates as `user`
export const attachUser = (req: Request, res: Response, next: NextFunction): void => {
  res.locals['user'] = req.user ?? null;
  res.locals['isAuthenticated'] = req.isAuthenticated();
  next();
};

// Redirects unauthenticated users to /auth/login
// Saves the originally requested URL so the user is sent there after login
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) { next(); return; }
  req.session['returnTo'] = req.originalUrl;
  res.redirect('/auth/login');
};

// Redirects already-authenticated users away from pages like /auth/login and /auth/register
export const requireNoAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.isAuthenticated()) { next(); return; }
  res.redirect('/web-dashboard');
};

// Blocks non-admin users from accessing admin routes.
// If not logged in at all, redirects to /admin/login.
// If logged in but not admin, renders a 403 error page.
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.isAuthenticated()) {
    req.session['returnTo'] = req.originalUrl;
    res.redirect('/admin/login');
    return;
  }

  if ((req.user as any)?.role !== 'admin') {
    res.status(403).render('pages/error', {
      title:       'Access Denied',
      error:       'You are not authorized to access this page.',
      projectName: 'CS Library Project',
    });
    return;
  }

  next();
};