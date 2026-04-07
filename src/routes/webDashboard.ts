import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { books, loans, holds, suggestions } from '../db/schema/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';

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
// Includes borrowerUserId for checked-out books so the UI can hide hold buttons

router.get('/api/catalog', async (req: Request, res: Response) => {
  try {
    const allBooks = await db.select().from(books).orderBy(books.title);

    // Get active loans to find who has each checked-out book
    const activeLoans = await db
      .select({ isbn: loans.isbn, userId: loans.userId })
      .from(loans)
      .where(eq(loans.returned, false));

    const borrowerMap = new Map(activeLoans.map(l => [l.isbn, l.userId]));

    const enriched = allBooks.map(b => ({
      ...b,
      borrowerUserId: borrowerMap.get(b.isbn) ?? null,
    }));

    res.json({ books: enriched, currentUserId: (req.user as any)?.id ?? null });
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

// POST /web-dashboard/api/hold — Place a hold on a checked-out book

router.post('/api/hold', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id as number;
    const isbn   = String(req.body.isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();

    if (!isbn) { res.status(400).json({ error: 'ISBN is required.' }); return; }

    // Check book exists and is checked out
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (!book) { res.status(404).json({ error: 'Book not found.' }); return; }
    if (book.status === 'Available') {
      res.status(409).json({ error: 'This book is available — no hold needed.' });
      return;
    }

    // Check if user is the current borrower
    const [activeLoan] = await db.select().from(loans)
      .where(and(eq(loans.isbn, isbn), eq(loans.returned, false), eq(loans.userId, userId)))
      .limit(1);
    if (activeLoan) {
      res.status(409).json({ error: 'You already have this book checked out.' });
      return;
    }

    // Check duplicate hold
    const [existingHold] = await db.select().from(holds)
      .where(and(eq(holds.userId, userId), eq(holds.isbn, isbn), eq(holds.status, 'pending')))
      .limit(1);
    if (existingHold) {
      res.status(409).json({ error: 'You already have a hold on this book.' });
      return;
    }

    const [newHold] = await db.insert(holds).values({
      userId, isbn, status: 'pending',
    }).returning();

    res.json({ ok: true, hold: newHold });
  } catch (err) {
    console.error('[WebDashboard] /api/hold error:', err);
    res.status(500).json({ error: 'Failed to place hold.' });
  }
});

// POST /web-dashboard/api/suggest — Submit a book suggestion

router.post('/api/suggest', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id as number;
    const title  = String(req.body.title ?? '').trim();
    const author = String(req.body.author ?? '').trim();
    const reason = String(req.body.reason ?? '').trim();

    if (!title) { res.status(400).json({ error: 'Book title is required.' }); return; }

    const [s] = await db.insert(suggestions).values({
      userId, title, author, reason, status: 'pending',
    }).returning();

    res.json({ ok: true, suggestion: s });
  } catch (err) {
    console.error('[WebDashboard] /api/suggest error:', err);
    res.status(500).json({ error: 'Failed to submit suggestion.' });
  }
});

export default router;