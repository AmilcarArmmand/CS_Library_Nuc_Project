// REST API endpoints called by the Raspberry Pi kiosk system.
// Protected by a shared KIOSK_API_KEY header.
//
// TO BE MOUNTED IN app.ts:
// import kioskApiRoutes from './routes/kioskApi.js';
// app.use('/api/kiosk', kioskApiRoutes);

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { users, books, loans } from '../db/schema/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
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

    if (user) {
      if (!user.active) {
        res.status(403).json({ error: 'Account is disabled.' });
        return;
      }
      res.json({ user });
      return;
    }

    if (!user) {
    res.status(404).json({ error: 'Student ID not found.' });
    return;
    }

  } catch (err) {
    console.error('[Kiosk API] /login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/kiosk/books

router.get('/books', async (_req: Request, res: Response) => {
  try {
    const allBooks = await db.select().from(books).orderBy(books.title);
    res.json({ books: allBooks });
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
    if (!book) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }
    res.json({ book });
  } catch {
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

export default router;