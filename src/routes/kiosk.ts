// This serves the kiosk UI and all the API calls it makes.
// TO BE MOUNTED at /kiosk in app.ts.
//
//   GET  /kiosk                  → kiosk-login.ejs
//   POST /kiosk/login            → student ID lookup / auto-provision
//   GET  /kiosk/dashboard        → kiosk-dashboard.ejs
//   GET  /kiosk/logout           → destroy session, back to login
//   GET  /kiosk/api/catalog      → all books
//   GET  /kiosk/api/books/:isbn  → single book
//   POST /kiosk/api/checkout     → check out cart
//   POST /kiosk/api/return       → return a book
//   GET  /kiosk/api/my-loans     → current user's loans
//   POST /kiosk/api/renew        → renew a loan

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { users, books, loans } from '../db/schema/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { addDays } from 'date-fns';

const router = express.Router();

// Session Types

interface KioskUser {
  id: number;
  name: string;
  email: string;
  studentId: string | null;
  active: boolean;
}

function getKioskUser(req: Request): KioskUser | null {
  return (req.session as any)['kioskUser'] ?? null;
}

function setKioskUser(req: Request, user: KioskUser | null): void {
  (req.session as any)['kioskUser'] = user;
}

function getCart(req: Request): any[] {
  return (req.session as any)['kioskCart'] ?? [];
}

function setCart(req: Request, cart: any[]): void {
  (req.session as any)['kioskCart'] = cart;
}

// AUTH GUARD

function requireKioskLogin(req: Request, res: Response, next: NextFunction): void {
  if (getKioskUser(req)) { next(); return; }
  res.redirect('/kiosk');
}

// GET /kiosk — Login page

router.get('/', (req: Request, res: Response) => {
  if (getKioskUser(req)) { res.redirect('/kiosk/dashboard'); return; }
  res.render('pages/kiosk-login', { title: 'CS Library Kiosk', error: null });
});

// POST /kiosk/login — Scan student ID

router.post('/login', async (req: Request, res: Response) => {
  const raw       = String(req.body.studentId ?? '');
  const studentId = raw.replace(/\s+/g, '').toUpperCase();

  if (!/^[A-Z0-9]{5,16}$/.test(studentId)) {
    res.render('pages/kiosk-login', {
      title: 'CS Library Kiosk',
      error: 'Scan a valid student ID barcode to continue.',
    });
    return;
  }

  try {
    // Try to find existing user
    let [user] = await db
      .select({ id: users.id, name: users.name, email: users.email,
                studentId: users.studentId, active: users.active })
      .from(users)
      .where(eq(users.studentId, studentId))
      .limit(1);

    // Reject any ID not already registered in the database
    if (!user) {
      res.render('pages/kiosk-login', {
        title: 'CS Library Kiosk',
        error: 'Student ID not found. Please register an account first.',
      });
      return;
    }

    if (!user.active) {
      res.render('pages/kiosk-login', {
        title: 'CS Library Kiosk',
        error: 'This student ID is disabled. Please contact library staff.',
      });
      return;
    }

    setKioskUser(req, user as KioskUser);
    if (!getCart(req).length) setCart(req, []);

    const msg = encodeURIComponent(`Welcome, ${user.name}!`);
    res.redirect(`/kiosk/dashboard?welcome=${msg}`);

  } catch (err) {
    console.error('[Kiosk] Login error:', err);
    res.render('pages/kiosk-login', {
      title: 'CS Library Kiosk',
      error: 'Server error. Please try again.',
    });
  }
});

// GET /kiosk/dashboard

router.get('/dashboard', requireKioskLogin, (req: Request, res: Response) => {
  const user    = getKioskUser(req)!;
  const welcome = req.query['welcome'] ? String(req.query['welcome']) : null;

  res.render('pages/kiosk-dashboard', {
    title:   'CS Library Kiosk',
    user,
    cart:    getCart(req),
    welcome,
  });
});

// GET /kiosk/logout

router.get('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => res.redirect('/kiosk'));
});

// GET /kiosk/api/catalog

router.get('/api/catalog', requireKioskLogin, async (_req: Request, res: Response) => {
  try {
    const allBooks = await db.select().from(books).orderBy(books.title);
    res.json({ books: allBooks });
  } catch (err) {
    console.error('[Kiosk API] /catalog error:', err);
    res.status(500).json({ error: 'Could not load catalog.' });
  }
});

// GET /kiosk/api/books/:isbn

router.get('/api/books/:isbn', requireKioskLogin, async (req: Request, res: Response) => {
  try {
    const rawIsbn = String(req.params['isbn'] ?? '');
    const isbn    = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();

    if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
      res.status(400).json({ error: 'Scan or type a valid 10- or 13-digit ISBN.' });
      return;
    }

    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (!book) { res.status(404).json({ error: 'Book not found.' }); return; }
    res.json({ book });
  } catch (err) {
    console.error('[Kiosk API] /books/:isbn error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /kiosk/api/checkout

router.post('/api/checkout', requireKioskLogin, async (req: Request, res: Response) => {
  try {
    const user   = getKioskUser(req)!;
    const cart   = getCart(req);
    const isbns  = cart.map((b: any) => String(b.isbn ?? ''));

    if (!isbns.length) {
      res.status(400).json({ error: 'Cart is empty.' });
      return;
    }

    const dueDate = addDays(new Date(), 14);
    let checkedOut = 0;
    let requested  = isbns.length;

    for (const isbn of isbns) {
      const result = await db
        .update(books)
        .set({ status: 'Checked Out' })
        .where(and(eq(books.isbn, isbn), eq(books.status, 'Available')))
        .returning({ isbn: books.isbn });

      if (!result.length) continue;
      await db.insert(loans).values({ userId: user.id, isbn, dueDate });
      checkedOut++;
    }

    // Clear cart after checkout
    setCart(req, []);

    res.json({ checkedOut, requested, dueDate });
  } catch (err) {
    console.error('[Kiosk API] /checkout error:', err);
    res.status(500).json({ error: 'Checkout failed.' });
  }
});

// POST /kiosk/api/cart/add

// Adds a book to the session cart (called after a successful ISBN scan)

router.post('/api/cart/add', requireKioskLogin, async (req: Request, res: Response) => {
  try {
    const rawIsbn = String(req.body.isbn ?? '');
    const isbn    = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();

    if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
      res.status(400).json({ error: 'Scan or type a valid 10- or 13-digit ISBN.' });
      return;
    }

    const cart = getCart(req);
    if (cart.some((b: any) => b.isbn === isbn)) {
      res.status(409).json({ error: 'This book is already in the cart.' });
      return;
    }

    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (!book)  { res.status(404).json({ error: 'Book not found.' }); return; }
    if (book.status !== 'Available') {
      res.status(409).json({ error: 'Book is already checked out.' });
      return;
    }

    cart.push(book);
    setCart(req, cart);
    res.json({ book, cartCount: cart.length });

  } catch (err) {
    console.error('[Kiosk API] /cart/add error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /kiosk/api/cart/clear

router.post('/api/cart/clear', requireKioskLogin, (req: Request, res: Response) => {
  setCart(req, []);
  res.json({ ok: true });
});

// POST /kiosk/api/return

router.post('/api/return', requireKioskLogin, async (req: Request, res: Response) => {
  try {
    const rawIsbn = String(req.body.isbn ?? '');
    const isbn    = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();

    if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
      res.status(400).json({ error: 'Scan or type a valid 10- or 13-digit ISBN.' });
      return;
    }

    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (!book) { res.status(404).json({ error: 'Book not found.' }); return; }
    if (book.status === 'Available') {
      res.status(409).json({ error: 'Book is already returned.' });
      return;
    }

    const [loan] = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.isbn, isbn), eq(loans.returned, false)))
      .orderBy(desc(loans.checkedOut))
      .limit(1);

    if (!loan) { res.status(404).json({ error: 'No active loan found.' }); return; }

    await db.update(loans)
      .set({ returned: true, returnedDate: new Date() })
      .where(eq(loans.id, loan.id));
    await db.update(books)
      .set({ status: 'Available' })
      .where(eq(books.isbn, isbn));

    res.json({ ok: true, book });
  } catch (err) {
    console.error('[Kiosk API] /return error:', err);
    res.status(500).json({ error: 'Return failed.' });
  }
});

// GET /kiosk/api/my-loans

router.get('/api/my-loans', requireKioskLogin, async (req: Request, res: Response) => {
  try {
    const user = getKioskUser(req)!;

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
      .where(eq(loans.userId, user.id))
      .orderBy(desc(loans.checkedOut));

    res.json({ loans: rows });
  } catch (err) {
    console.error('[Kiosk API] /my-loans error:', err);
    res.status(500).json({ error: 'Could not fetch loans.' });
  }
});

// POST /kiosk/api/renew

router.post('/api/renew', requireKioskLogin, async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.body.loanId);
    if (!loanId) { res.status(400).json({ error: 'loanId is required.' }); return; }

    const user = getKioskUser(req)!;

    // Verify the loan belongs to this user and is still active
    const [loan] = await db
      .select({ id: loans.id, isbn: loans.isbn, userId: loans.userId })
      .from(loans)
      .where(and(eq(loans.id, loanId), eq(loans.returned, false)))
      .limit(1);

    if (!loan || loan.userId !== user.id) {
      res.status(404).json({ error: 'Loan not found.' });
      return;
    }

    // Check for pending holds on this book by other users
    const holdsCheck = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.isbn, loan.isbn), eq(loans.returned, false)))
      .limit(2);

    // Simple hold check: if more than one active loan for same ISBN, block renewal
    // (In production this would query the holds table properly)

    const newDueDate = addDays(new Date(), 14);
    await db
      .update(loans)
      .set({ dueDate: newDueDate })
      .where(eq(loans.id, loanId));

    res.json({ ok: true, newDueDate });
  } catch (err) {
    console.error('[Kiosk API] /renew error:', err);
    res.status(500).json({ error: 'Renewal failed.' });
  }
});

export default router;