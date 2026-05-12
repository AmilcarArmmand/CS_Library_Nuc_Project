// REST API endpoints called by the Raspberry Pi kiosk system.
// Protected by a shared KIOSK_API_KEY header.
//
// TO BE MOUNTED IN app.ts:
// import kioskApiRoutes from './routes/kioskApi.js';
// app.use('/api/kiosk', kioskApiRoutes);

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { users, books, loans, holds, donations, renewalRequests, equipment, equipmentUnits, equipmentLoans } from '../db/schema/schema.js';
import { eq, and, asc, desc, count, or } from 'drizzle-orm';
import { addDays } from 'date-fns';
import {
  sendCheckoutConfirmationEmail,
  sendDonationReceiptEmail,
  sendHoldAvailableEmail,
} from '../utils/emailService.js';
import { fetchOpenLibraryBookByIsbn, normalizeIsbn } from '../utils/openLibrary.js';

const router = express.Router();
const LOAN_PERIOD_DAYS = 14;
const HOLD_PICKUP_DAYS = 7;

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

function extractStudentId(raw: unknown): string {
  const value = String(raw ?? '').trim().toUpperCase();
  const compact = value.replace(/\s+/g, '');

  const scsuStudentId = value.match(/(?:^|\D)(70\d{6})(?:\D|$)/) ?? compact.match(/70\d{6}/);
  if (scsuStudentId?.[1] || scsuStudentId?.[0]) {
    return scsuStudentId[1] ?? scsuStudentId[0];
  }

  const scsuCardNumber = value.match(/(?:^|\D)603277(\d{8})\d{2}(?:\D|$)/) ?? compact.match(/^603277(\d{8})\d{2}$/);
  if (scsuCardNumber?.[1]) {
    return scsuCardNumber[1];
  }

  if (/^[A-Z0-9]{5,16}$/.test(compact)) {
    return compact;
  }

  const labeled = value.match(/(?:STUDENT\s*ID|STUDENTID|EMPLID|EMPLOYEE\s*ID|EMPLOYEEID|ID)[^A-Z0-9]{0,8}([A-Z0-9]{5,16})/);
  if (labeled?.[1]) {
    return labeled[1].replace(/\s+/g, '');
  }

  const numericCandidate = value.match(/\d{5,16}/);
  if (numericCandidate?.[0]) {
    return numericCandidate[0];
  }

  return value.replace(/[^A-Z0-9]/g, '').match(/[A-Z0-9]{5,16}/)?.[0] ?? '';
}

async function findActiveHoldForBook(isbn: string) {
  const [hold] = await db
    .select({
      id: holds.id,
      userId: holds.userId,
      status: holds.status,
      createdAt: holds.createdAt,
    })
    .from(holds)
    .where(and(
      eq(holds.isbn, isbn),
      or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
    ))
    .orderBy(asc(holds.createdAt))
    .limit(1);

  return hold ?? null;
}

// POST /api/kiosk/login

router.post('/login', async (req: Request, res: Response) => {
  try {
    const studentId = extractStudentId(req.body.studentId);

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
    const requestedUserId = Number(_req.query['userId']);
    const allBooks = await db.select().from(books).orderBy(books.title);

    // Include borrower userId for checked-out books
    const activeLoans = await db
      .select({ isbn: loans.isbn, userId: loans.userId })
      .from(loans)
      .where(eq(loans.returned, false));

    const borrowerMap = new Map(activeLoans.map(l => [l.isbn, l.userId]));

    const activeHolds = requestedUserId
      ? await db
          .select({ isbn: holds.isbn })
          .from(holds)
          .where(and(
            eq(holds.userId, requestedUserId),
            or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
          ))
      : [];

    const heldIsbns = new Set(activeHolds.map(h => h.isbn));

    const enriched = allBooks.map(b => ({
      ...b,
      borrowerUserId: borrowerMap.get(b.isbn) ?? null,
      heldByCurrentUser: heldIsbns.has(b.isbn),
    }));

    res.json({ books: enriched });
  } catch {
    res.status(500).json({ error: 'Could not fetch catalog.' });
  }
});

// GET /api/kiosk/books/:isbn

router.get('/books/:isbn', async (req: Request, res: Response) => {
  try {
    const isbn = normalizeIsbn(req.params['isbn'] ?? '');

    if (!isbn) {
      res.status(400).json({ error: 'Invalid ISBN.' });
      return;
    }

    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    
    if (book) {
      res.json({ book });
      return;
    }

    const metadata = await fetchOpenLibraryBookByIsbn(isbn);
    if (!metadata) {
      res.status(404).json({ error: 'Book not found locally or on Open Library.' });
      return;
    }

    // Automatically add the new book to the local database
    const [newBook] = await db.insert(books).values({
      isbn: metadata.isbn,
      title: metadata.title,
      author: metadata.author,
      cover: metadata.cover,
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
      .map((i: string) => normalizeIsbn(i))
      .filter(Boolean) as string[];

    if (!userId || !isbns.length) {
      res.status(400).json({ error: 'userId and isbns are required.' });
      return;
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        active: users.active,
        borrowingLimit: users.borrowingLimit,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ error: 'Account is disabled.' });
      return;
    }

    const [activeLoanSummary] = await db
      .select({ count: count() })
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.returned, false)));

    const activeLoanCount = Number(activeLoanSummary?.count ?? 0);
    const borrowingLimit = Number(user.borrowingLimit ?? 5);
    const remainingSlots = Math.max(0, borrowingLimit - activeLoanCount);

    if (remainingSlots <= 0) {
      res.status(409).json({ error: `Borrowing limit reached (${borrowingLimit} books).` });
      return;
    }

    const dueDate = addDays(new Date(), LOAN_PERIOD_DAYS);
    let checkedOutCount = 0;
    const checkedOutBooks: Array<{ title: string; author: string }> = [];
    const blocked: Array<{ isbn: string; reason: string }> = [];

    for (const isbn of isbns) {
      if (checkedOutCount >= remainingSlots) {
        blocked.push({ isbn, reason: 'Borrowing limit reached.' });
        continue;
      }

      const [book] = await db
        .select({
          isbn: books.isbn,
          title: books.title,
          author: books.author,
          status: books.status,
        })
        .from(books)
        .where(eq(books.isbn, isbn))
        .limit(1);

      if (!book) {
        blocked.push({ isbn, reason: 'Book not found.' });
        continue;
      }

      if (book.status !== 'Available') {
        blocked.push({ isbn, reason: 'Not available.' });
        continue;
      }

      const [existingLoan] = await db
        .select({ id: loans.id })
        .from(loans)
        .where(and(eq(loans.userId, userId), eq(loans.isbn, isbn), eq(loans.returned, false)))
        .limit(1);

      if (existingLoan) {
        blocked.push({ isbn, reason: 'Already checked out by you.' });
        continue;
      }

      const result = await db
        .update(books)
        .set({ status: 'Checked Out' })
        .where(and(eq(books.isbn, isbn), eq(books.status, 'Available')))
        .returning({ title: books.title, author: books.author });

      if (!result.length) {
        blocked.push({ isbn, reason: 'Could not reserve — try again.' });
        continue;
      }

      const activeHold = await findActiveHoldForBook(isbn);
      if (activeHold?.userId === userId) {
        await db
          .update(holds)
          .set({ status: 'fulfilled', pickupDate: null })
          .where(eq(holds.id, activeHold.id));
      }

      await db.insert(loans).values({ userId, isbn, dueDate });

      checkedOutBooks.push({
        title: result[0]?.title ?? 'Unknown Title',
        author: result[0]?.author ?? 'Unknown Author',
      });
      checkedOutCount++;
    }

    if (checkedOutCount > 0) {
      void sendCheckoutConfirmationEmail({
        to: user.email,
        name: user.name,
        books: checkedOutBooks,
        dueDate,
      })
        .then((emailResult) => {
          if (!emailResult.success) {
            console.warn(`[Kiosk API] Checkout email was not delivered for ${user.email}.`);
          }
        })
        .catch((error) => {
          console.error('[Kiosk API] Checkout confirmation email failed:', error);
        });
    }

    res.json({
      checkedOut: checkedOutCount,
      requested: isbns.length,
      dueDate,
      blocked,
      borrowingLimit,
      activeLoans: activeLoanCount + checkedOutCount,
    });

  } catch (err) {
    console.error('[Kiosk API] /checkout error:', err);
    res.status(500).json({ error: 'Checkout failed.' });
  }
});

// POST /api/kiosk/return

router.post('/return', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.body.userId);
    const isbn = normalizeIsbn(String(req.body.isbn ?? ''));

    if (!userId || !isbn) {
      res.status(400).json({ error: 'userId and isbn are required.' });
      return;
    }

    const [loan] = await db
      .select({ id: loans.id, userId: loans.userId })
      .from(loans)
      .where(and(eq(loans.isbn, isbn), eq(loans.returned, false)))
      .orderBy(loans.checkedOut)
      .limit(1);

    if (!loan) {
      res.status(404).json({ error: 'No active loan found for this ISBN.' });
      return;
    }

    if (loan.userId !== userId) {
      res.status(403).json({ error: 'You can only return books checked out on your account.' });
      return;
    }

    const returnedDate = new Date();

    await db
      .update(loans)
      .set({ returned: true, returnedDate })
      .where(eq(loans.id, loan.id));

    const [nextHold] = await db
      .select({
        id: holds.id,
        userId: holds.userId,
        name: users.name,
        email: users.email,
        title: books.title,
        author: books.author,
      })
      .from(holds)
      .innerJoin(users, eq(holds.userId, users.id))
      .innerJoin(books, eq(holds.isbn, books.isbn))
      .where(and(eq(holds.isbn, isbn), eq(holds.status, 'pending')))
      .orderBy(asc(holds.createdAt))
      .limit(1);

    let holdReady: { userId: number; pickupDate: Date } | null = null;
    if (nextHold) {
      const pickupDate = addDays(returnedDate, HOLD_PICKUP_DAYS);
      await db
        .update(holds)
        .set({ status: 'ready', pickupDate })
        .where(eq(holds.id, nextHold.id));

      await db.update(books).set({ status: 'On Hold' }).where(eq(books.isbn, isbn));
      holdReady = { userId: nextHold.userId, pickupDate };

      void sendHoldAvailableEmail({
        to: nextHold.email,
        name: nextHold.name,
        book: {
          title: nextHold.title,
          author: nextHold.author,
        },
        pickupDate,
      })
        .then((emailResult) => {
          if (!emailResult.success) {
            console.warn(`[Kiosk API] Hold-ready email was not delivered for ${nextHold.email}.`);
          }
        })
        .catch((error) => {
          console.error('[Kiosk API] Hold-ready email failed:', error);
        });
    } else {
      await db.update(books).set({ status: 'Available' }).where(eq(books.isbn, isbn));
    }

    // Return the updated book so the kiosk dashboard can show the title/cover
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    res.json({ ok: true, book, holdReady });

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
      .select({ id: loans.id, userId: loans.userId, isbn: loans.isbn, dueDate: loans.dueDate })
      .from(loans)
      .where(and(eq(loans.id, loanId), eq(loans.returned, false)))
      .limit(1);

    if (!loan) { res.status(404).json({ error: 'Loan not found.' }); return; }

    if (loan.dueDate < new Date()) {
      res.status(409).json({ error: 'Overdue books cannot be renewed.' });
      return;
    }

    // Check if this loan has already been renewed once
    const [existingRenewal] = await db
      .select({ id: renewalRequests.id })
      .from(renewalRequests)
      .where(eq(renewalRequests.loanId, loanId))
      .limit(1);

    if (existingRenewal) {
      res.status(409).json({ error: 'This loan has already been renewed once.' });
      return;
    }

    const activeHold = await findActiveHoldForBook(loan.isbn);
    if (activeHold) {
      res.status(409).json({ error: 'This book cannot be renewed because it has an active hold.' });
      return;
    }

    const newDueDate = addDays(new Date(loan.dueDate), LOAN_PERIOD_DAYS);

    await db.update(loans).set({ dueDate: newDueDate }).where(eq(loans.id, loanId));

    // Record the renewal so it can't be done again
    await db.insert(renewalRequests).values({
      loanId,
      userId: loan.userId,
      status: 'approved',
      reviewedAt: new Date(),
    });

    res.json({ ok: true, newDueDate });
  } catch (err) {
    console.error('[Kiosk API] /renew error:', err);
    res.status(500).json({ error: 'Renewal failed.' });
  }
});

// POST /api/kiosk/donate — Add a donated book

router.post('/donate', async (req: Request, res: Response) => {
  try {
    const isbn   = normalizeIsbn(String(req.body.isbn ?? ''));
    const title  = String(req.body.title ?? '').trim();
    const author = String(req.body.author ?? '').trim();
    const cover  = String(req.body.cover ?? '').trim();
    const donorUserId = Number(req.body.userId);
    const donorName = String(req.body.donorName ?? '').trim();
    const donorEmail = String(req.body.donorEmail ?? '').trim().toLowerCase();

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

    let resolvedDonorUserId: number | null = null;
    let resolvedDonorName = donorName || 'Anonymous';
    let resolvedDonorEmail = donorEmail || null;

    if (donorUserId) {
      const [donorUser] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, donorUserId))
        .limit(1);

      if (donorUser) {
        resolvedDonorUserId = donorUser.id;
        resolvedDonorName = donorName || donorUser.name;
        resolvedDonorEmail = donorEmail || donorUser.email;
      }
    }

    const [donation] = await db.insert(donations).values({
      donorUserId: resolvedDonorUserId,
      donorName: resolvedDonorName,
      donorEmail: resolvedDonorEmail,
      isbn,
      title,
      author: author || 'Unknown Author',
      status: 'pending',
    }).returning();

    if (resolvedDonorEmail) {
      void sendDonationReceiptEmail({
        to: resolvedDonorEmail,
        name: resolvedDonorName,
        title,
        author: author || 'Unknown Author',
      })
        .then((emailResult) => {
          if (!emailResult.success) {
            console.warn(`[Kiosk API] Donation receipt email was not delivered for ${resolvedDonorEmail}.`);
          }
        })
        .catch((error) => {
          console.error('[Kiosk API] Donation receipt email failed:', error);
        });
    }

    res.json({ ok: true, book: newBook, donation });

  } catch (err) {
    console.error('[Kiosk API] /donate error:', err);
    res.status(500).json({ error: 'Donation failed.' });
  }
});

// POST /api/kiosk/hold — Place a hold on a checked-out book

router.post('/hold', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.body.userId);
    const isbn   = normalizeIsbn(String(req.body.isbn ?? ''));

    if (!userId || !isbn) {
      res.status(400).json({ error: 'userId and isbn are required.' });
      return;
    }

    const [user] = await db
      .select({ id: users.id, active: users.active })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ error: 'Account is disabled.' });
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

    const [activeLoan] = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.isbn, isbn), eq(loans.returned, false), eq(loans.userId, userId)))
      .limit(1);

    if (activeLoan) {
      res.status(409).json({ error: 'You already have this book checked out.' });
      return;
    }

    // Check duplicate hold
    const [existingHold] = await db.select().from(holds)
      .where(and(
        eq(holds.userId, userId),
        eq(holds.isbn, isbn),
        or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
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

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/kiosk/equipment/scan/:barcode
// Look up a physical unit by its barcode label.

router.get('/equipment/scan/:barcode', async (req: Request, res: Response) => {
  try {
    const barcode = String(req.params['barcode'] ?? '').trim().toUpperCase();
    if (!barcode) {
      res.status(400).json({ error: 'Barcode is required.' });
      return;
    }

    const [unit] = await db
      .select({
        id:               equipmentUnits.id,
        barcode:          equipmentUnits.barcode,
        condition:        equipmentUnits.condition,
        status:           equipmentUnits.status,
        notes:            equipmentUnits.notes,
        equipmentId:      equipmentUnits.equipmentId,
        name:             equipment.name,
        description:      equipment.description,
        category:         equipment.category,
        image:            equipment.image,
        loanDurationDays: equipment.loanDurationDays,
      })
      .from(equipmentUnits)
      .innerJoin(equipment, eq(equipmentUnits.equipmentId, equipment.id))
      .where(eq(equipmentUnits.barcode, barcode))
      .limit(1);

    if (!unit) {
      res.status(404).json({ error: 'No equipment found with that barcode.' });
      return;
    }

    const [activeLoan] = await db
      .select({
        id:           equipmentLoans.id,
        userId:       equipmentLoans.userId,
        checkedOut:   equipmentLoans.checkedOut,
        dueDate:      equipmentLoans.dueDate,
        borrowerName: users.name,
      })
      .from(equipmentLoans)
      .innerJoin(users, eq(equipmentLoans.userId, users.id))
      .where(and(eq(equipmentLoans.unitId, unit.id), eq(equipmentLoans.returned, false)))
      .limit(1);

    res.json({ unit, activeLoan: activeLoan ?? null });
  } catch (err) {
    console.error('[Kiosk API] /equipment/scan error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/kiosk/equipment/checkout
// Check out an equipment unit to a user.

router.post('/equipment/checkout', async (req: Request, res: Response) => {
  try {
    const userId  = Number(req.body.userId);
    const barcode = String(req.body.barcode ?? '').trim().toUpperCase();

    if (!userId || !barcode) {
      res.status(400).json({ error: 'userId and barcode are required.' });
      return;
    }

    const [user] = await db
      .select({ id: users.id, active: users.active })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user)        { res.status(404).json({ error: 'User not found.' }); return; }
    if (!user.active) { res.status(403).json({ error: 'Account is disabled.' }); return; }

    const [unit] = await db
      .select({
        id:               equipmentUnits.id,
        status:           equipmentUnits.status,
        equipmentId:      equipmentUnits.equipmentId,
        name:             equipment.name,
        loanDurationDays: equipment.loanDurationDays,
      })
      .from(equipmentUnits)
      .innerJoin(equipment, eq(equipmentUnits.equipmentId, equipment.id))
      .where(eq(equipmentUnits.barcode, barcode))
      .limit(1);

    if (!unit) {
      res.status(404).json({ error: 'Equipment not found.' });
      return;
    }

    if (unit.status !== 'Available') {
      res.status(409).json({ error: `This unit is currently ${unit.status.toLowerCase()}.` });
      return;
    }

    // Double-check: no active loan on this specific unit
    const [existingUnitLoan] = await db
      .select({ id: equipmentLoans.id })
      .from(equipmentLoans)
      .where(and(eq(equipmentLoans.unitId, unit.id), eq(equipmentLoans.returned, false)))
      .limit(1);

    if (existingUnitLoan) {
      res.status(409).json({ error: 'This unit is already on loan.' });
      return;
    }

    // One-per-type rule: user can't have two active loans of the same equipment type
    const [existingTypeLoan] = await db
      .select({ id: equipmentLoans.id })
      .from(equipmentLoans)
      .innerJoin(equipmentUnits, eq(equipmentLoans.unitId, equipmentUnits.id))
      .where(
        and(
          eq(equipmentLoans.userId, userId),
          eq(equipmentUnits.equipmentId, unit.equipmentId),
          eq(equipmentLoans.returned, false),
        ),
      )
      .limit(1);

    if (existingTypeLoan) {
      res.status(409).json({ error: `You already have a ${unit.name} checked out.` });
      return;
    }

    const dueDate = addDays(new Date(), unit.loanDurationDays);

    await db.insert(equipmentLoans).values({ userId, unitId: unit.id, dueDate });
    await db.update(equipmentUnits).set({ status: 'Checked Out' }).where(eq(equipmentUnits.id, unit.id));

    res.json({ ok: true, name: unit.name, dueDate });
  } catch (err) {
    console.error('[Kiosk API] /equipment/checkout error:', err);
    res.status(500).json({ error: 'Equipment checkout failed.' });
  }
});

// POST /api/kiosk/equipment/return
// Return an equipment unit by barcode.

router.post('/equipment/return', async (req: Request, res: Response) => {
  try {
    const barcode = String(req.body.barcode ?? '').trim().toUpperCase();
    const userId  = Number(req.body.userId);

    if (!barcode) {
      res.status(400).json({ error: 'Barcode is required.' });
      return;
    }

    const [unit] = await db
      .select({
        id:    equipmentUnits.id,
        name:  equipment.name,
        image: equipment.image,
      })
      .from(equipmentUnits)
      .innerJoin(equipment, eq(equipmentUnits.equipmentId, equipment.id))
      .where(eq(equipmentUnits.barcode, barcode))
      .limit(1);

    if (!unit) {
      res.status(404).json({ error: 'No equipment found with that barcode.' });
      return;
    }

    const [loan] = await db
      .select({ id: equipmentLoans.id, userId: equipmentLoans.userId })
      .from(equipmentLoans)
      .where(and(eq(equipmentLoans.unitId, unit.id), eq(equipmentLoans.returned, false)))
      .limit(1);

    if (!loan) {
      res.status(404).json({ error: 'No active loan found for this equipment.' });
      return;
    }

    if (userId && loan.userId !== userId) {
      res.status(403).json({ error: 'This equipment is not checked out on your account.' });
      return;
    }

    await db
      .update(equipmentLoans)
      .set({ returned: true, returnedDate: new Date() })
      .where(eq(equipmentLoans.id, loan.id));

    await db
      .update(equipmentUnits)
      .set({ status: 'Available' })
      .where(eq(equipmentUnits.id, unit.id));

    res.json({ ok: true, name: unit.name, image: unit.image ?? '' });
  } catch (err) {
    console.error('[Kiosk API] /equipment/return error:', err);
    res.status(500).json({ error: 'Equipment return failed.' });
  }
});

// GET /api/kiosk/equipment/loans/:userId
// Get all equipment loans for a user.

router.get('/equipment/loans/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params['userId']);
    if (!userId) {
      res.status(400).json({ error: 'Invalid userId.' });
      return;
    }

    const loanRows = await db
      .select({
        id:           equipmentLoans.id,
        barcode:      equipmentUnits.barcode,
        checkedOut:   equipmentLoans.checkedOut,
        dueDate:      equipmentLoans.dueDate,
        returned:     equipmentLoans.returned,
        returnedDate: equipmentLoans.returnedDate,
        name:         equipment.name,
        category:     equipment.category,
        image:        equipment.image,
      })
      .from(equipmentLoans)
      .innerJoin(equipmentUnits, eq(equipmentLoans.unitId, equipmentUnits.id))
      .innerJoin(equipment,      eq(equipmentUnits.equipmentId, equipment.id))
      .where(eq(equipmentLoans.userId, userId))
      .orderBy(desc(equipmentLoans.checkedOut));

    res.json({ loans: loanRows });
  } catch (err) {
    console.error('[Kiosk API] /equipment/loans error:', err);
    res.status(500).json({ error: 'Could not fetch equipment loans.' });
  }
});

export default router;