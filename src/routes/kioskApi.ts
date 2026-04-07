// REST API endpoints called by the Raspberry Pi kiosk system.
// Protected by a shared KIOSK_API_KEY header.
//
// TO BE MOUNTED IN app.ts:
// import kioskApiRoutes from './routes/kioskApi.js';
// app.use('/api/kiosk', kioskApiRoutes);

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { users, books, loans, holds } from '../db/schema/schema.js';
import { eq, and } from 'drizzle-orm';
import { addDays } from 'date-fns';

const router = express.Router();

// API KEY GUARD

function requireKioskKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-kiosk-key'];
  if (!process.env['KIOSK_API_KEY'] || key !== process.env['KIOSK_API_KEY']) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(requireKioskKey);

// POST /api/kiosk/login

router.post('/login', async (req: Request, res: Response) => {
  try {
    const raw       = String(req.body.studentId ?? '');
    const studentId = raw.replace(/\s+/g, '').toUpperCase();

    if (!/^[A-Z0-9]{5,16}$/.test(studentId)) {
      res.status(400).json({ error: 'Invalid student ID format.' });
      return;
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email,
                studentId: users.studentId, active: users.active })
      .from(users)
      .where(eq(users.studentId, studentId))
      .limit(1);

    // Reject unknown IDs — students must register via the web app first
    if (!user) {
      res.status(404).json({ error: 'Student ID not found.' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ error: 'Account is disabled.' });
      return;
    }

    res.json({ user });

  } catch (err) {
    console.error('[Kiosk API] /login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/kiosk/books
// Also responds to /catalog — the Pi kiosk proxy uses /catalog

router.get(['/books', '/catalog'], async (_req: Request, res: Response) => {
  try {
    const allBooks = await db.select().from(books).orderBy(books.title);

    // Include borrower userId for checked-out books
    const activeLoans = await db
      .select({ isbn: loans.isbn, userId: loans.userId })
      .from(loans)
      .where(eq(loans.returned, false));

    const borrowerMap = new Map(activeLoans.map(l => [l.isbn, l.userId]));

    const enriched = allBooks.map(b => ({
      ...b,
      borrowerUserId: borrowerMap.get(b.isbn) ?? null,
    }));

    res.json({ books: enriched });
  } catch {
    res.status(500).json({ error: 'Could not fetch catalog.' });
  }
});

// GET /api/kiosk/books/:isbn

router.get('/books/:isbn', async (req: Request, res: Response) => {
  try {
    const rawIsbn = req.params['isbn'] ?? '';
    const isbn    = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();

    if (!isbn) {
      res.status(400).json({ error: 'Invalid ISBN.' });
      return;
    }

    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    
    if (book) {
      res.json({ book });
      return;
    }

    // ── FALLBACK: Fetch from Open Library API ──
    const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const olData = await olRes.json().catch(() => ({}));
    const bookData = olData[`ISBN:${isbn}`];

    if (!bookData) {
      res.status(404).json({ error: 'Book not found locally or on Open Library.' });
      return;
    }

    const title  = bookData.title || `Unknown Title (${isbn})`;
    const author = bookData.authors?.[0]?.name || 'Unknown Author';
    const cover  = bookData.cover?.large || `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    // Automatically add the new book to the local database
    const [newBook] = await db.insert(books).values({
      isbn,
      title,
      author,
      cover,
      status: 'Available',
      shelf: 'Unsorted',
    }).returning();

    res.json({ book: newBook });

  } catch (err) {
    console.error('[Kiosk API] /books/:isbn error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/kiosk/checkout

router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const userId: number = Number(req.body.userId);
    const isbns: string[] = (Array.isArray(req.body.isbns) ? req.body.isbns : [])
      .map((i: string) => i.replace(/[^0-9Xx]/g, '').toUpperCase());

    if (!userId || !isbns.length) {
      res.status(400).json({ error: 'userId and isbns are required.' });
      return;
    }

    const dueDate = addDays(new Date(), 14);
    let count = 0;

    for (const isbn of isbns) {
      const result = await db
        .update(books)
        .set({ status: 'Checked Out' })
        .where(and(eq(books.isbn, isbn), eq(books.status, 'Available')))
        .returning({ isbn: books.isbn });

      if (result.length === 0) continue;

      await db.insert(loans).values({ userId, isbn, dueDate });
      count++;
    }

    res.json({ checkedOut: count, requested: isbns.length, dueDate });

  } catch (err) {
    console.error('[Kiosk API] /checkout error:', err);
    res.status(500).json({ error: 'Checkout failed.' });
  }
});

// POST /api/kiosk/return

router.post('/return', async (req: Request, res: Response) => {
  try {
    const isbn = String(req.body.isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();

    if (!isbn) {
      res.status(400).json({ error: 'isbn is required.' });
      return;
    }

    const [loan] = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.isbn, isbn), eq(loans.returned, false)))
      .orderBy(loans.checkedOut)
      .limit(1);

    if (!loan) {
      res.status(404).json({ error: 'No active loan found for this ISBN.' });
      return;
    }

    await db
      .update(loans)
      .set({ returned: true, returnedDate: new Date() })
      .where(eq(loans.id, loan.id));

    await db.update(books).set({ status: 'Available' }).where(eq(books.isbn, isbn));

    // Return the updated book so the kiosk dashboard can show the title/cover
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    res.json({ ok: true, book });

  } catch (err) {
    console.error('[Kiosk API] /return error:', err);
    res.status(500).json({ error: 'Return failed.' });
  }
});

// GET /api/kiosk/loans/:userId

router.get('/loans/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params['userId']);
    if (!userId) {
      res.status(400).json({ error: 'Invalid userId.' });
      return;
    }

    const loanRows = await db
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
      .orderBy(loans.checkedOut);

    res.json({ loans: loanRows });

  } catch (err) {
    console.error('[Kiosk API] /loans error:', err);
    res.status(500).json({ error: 'Could not fetch loans.' });
  }
});

router.post('/renew', async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.body.loanId);
    if (!loanId) { res.status(400).json({ error: 'loanId is required.' }); return; }

    const [loan] = await db
      .select({ id: loans.id, userId: loans.userId })
      .from(loans)
      .where(and(eq(loans.id, loanId), eq(loans.returned, false)))
      .limit(1);

    if (!loan) { res.status(404).json({ error: 'Loan not found.' }); return; }

    const newDueDate = addDays(new Date(), 14);
    await db.update(loans).set({ dueDate: newDueDate }).where(eq(loans.id, loanId));

    res.json({ ok: true, newDueDate });
  } catch (err) {
    console.error('[Kiosk API] /renew error:', err);
    res.status(500).json({ error: 'Renewal failed.' });
  }
});

// POST /api/kiosk/donate — Add a donated book

router.post('/donate', async (req: Request, res: Response) => {
  try {
    const isbn   = String(req.body.isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
    const title  = String(req.body.title ?? '').trim();
    const author = String(req.body.author ?? '').trim();
    const cover  = String(req.body.cover ?? '').trim();
    const donorName = String(req.body.donorName ?? '').trim();

    if (!isbn || !title) {
      res.status(400).json({ error: 'ISBN and title are required.' });
      return;
    }

    // Check if book already exists
    const [existing] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (existing) {
      res.status(409).json({ error: 'This book is already in the catalog.' });
      return;
    }

    const [newBook] = await db.insert(books).values({
      isbn,
      title,
      author: author || 'Unknown Author',
      cover:  cover || `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      status: 'Available',
      shelf:  'Donations',
    }).returning();

    console.log(`[Kiosk API] Book donated: "${title}" by ${donorName || 'Anonymous'}`);
    res.json({ ok: true, book: newBook });

  } catch (err) {
    console.error('[Kiosk API] /donate error:', err);
    res.status(500).json({ error: 'Donation failed.' });
  }
});

// POST /api/kiosk/hold — Place a hold on a checked-out book

router.post('/hold', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.body.userId);
    const isbn   = String(req.body.isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();

    if (!userId || !isbn) {
      res.status(400).json({ error: 'userId and isbn are required.' });
      return;
    }

    // Check book exists
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (!book) { res.status(404).json({ error: 'Book not found.' }); return; }

    // Check book is actually checked out
    if (book.status === 'Available') {
      res.status(409).json({ error: 'Book is available — just check it out instead.' });
      return;
    }

    // Check duplicate hold
    const [existingHold] = await db.select().from(holds)
      .where(and(
        eq(holds.userId, userId),
        eq(holds.isbn, isbn),
        eq(holds.status, 'pending'),
      )).limit(1);

    if (existingHold) {
      res.status(409).json({ error: 'You already have a hold on this book.' });
      return;
    }

    const [newHold] = await db.insert(holds).values({
      userId, isbn, status: 'pending',
    }).returning();

    res.json({ ok: true, hold: newHold });

  } catch (err) {
    console.error('[Kiosk API] /hold error:', err);
    res.status(500).json({ error: 'Failed to place hold.' });
  }
});

// GET /api/kiosk/holds/:userId — Get user's holds

router.get('/holds/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params['userId']);
    const userHolds = await db
      .select({
        id: holds.id,
        isbn: holds.isbn,
        status: holds.status,
        createdAt: holds.createdAt,
        title: books.title,
        author: books.author,
        cover: books.cover,
        bookStatus: books.status,
      })
      .from(holds)
      .innerJoin(books, eq(holds.isbn, books.isbn))
      .where(eq(holds.userId, userId))
      .orderBy(holds.createdAt);

    res.json({ holds: userHolds });
  } catch (err) {
    console.error('[Kiosk API] /holds error:', err);
    res.status(500).json({ error: 'Failed to fetch holds.' });
  }
});

export default router;