// Serves as the web dashboard (catalog browse + my loans).
// This is mounted at /web-dashboard in app.ts.
//
//   GET  /web-dashboard              → web-dashboard.ejs
//   GET  /web-dashboard/api/catalog  → all books
//   GET  /web-dashboard/api/my-loans → current user's loan history

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { books, loans } from '../db/schema/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

// AUTHORIZATION GUARD

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) { next(); return; }
  req.session['returnTo'] = req.originalUrl;
  res.redirect('/auth/login');
}

router.use(requireAuth);

// GET /web-dashboard

router.get('/', (req: Request, res: Response) => {
  res.render('pages/web-dashboard', {
    title: 'CS Library — My Library',
    user:  req.user,
  });
});

// GET /web-dashboard/api/catalog

router.get('/api/catalog', async (_req: Request, res: Response) => {
  try {
    const allBooks = await db.select().from(books).orderBy(books.title);
    res.json({ books: allBooks });
  } catch (err) {
    console.error('[WebDashboard] /api/catalog error:', err);
    res.status(500).json({ error: 'Could not load catalog.' });
  }
});

// GET /web-dashboard/api/my-loans

router.get('/api/my-loans', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id as number;

    const rows = await db
      .select({
        id:           loans.id,
        isbn:         loans.isbn,
        checkedOut:   loans.checkedOut,
        dueDate:      loans.dueDate,
        returned:     loans.returned,
        returnedDate: loans.returnedDate,
        title:        books.title,
        author:       books.author,
        cover:        books.cover,
      })
      .from(loans)
      .innerJoin(books, eq(loans.isbn, books.isbn))
      .where(eq(loans.userId, userId))
      .orderBy(desc(loans.checkedOut));

    res.json({ loans: rows });
  } catch (err) {
    console.error('[WebDashboard] /api/my-loans error:', err);
    res.status(500).json({ error: 'Could not fetch loans.' });
  }
});

export default router;