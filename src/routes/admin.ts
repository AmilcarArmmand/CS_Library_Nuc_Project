// Admin panel — accessible only to users with role = 'admin'.
// Mounted at /admin in app.ts.
//
// Sub-pages:
//   GET  /admin           → Dashboard with stats
//   GET  /admin/books     → Book management (list, add, edit, delete)
//   GET  /admin/loans     → Active checkout management
//   GET  /admin/users     → User account management
//   GET  /admin/reports   → Usage reports
//   GET  /admin/donations → Donation log

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from '../config/passport.js';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { users, books, loans, holds, suggestions, donations, renewalRequests } from '../db/schema/schema.js';
import { eq, count, and, lt, gt, desc, asc, sql, or } from 'drizzle-orm';
import { addDays } from 'date-fns';
import {
  fetchOpenLibraryBookByIsbn,
  mergeCatalogBookMetadata,
  normalizeIsbn,
} from '../utils/openLibrary.js';
import {
  sendSuggestionStatusEmail,
  sendDonationStatusEmail,
  sendRenewalRequestStatusEmail,
} from '../utils/emailService.js';

const router = express.Router();

type BookFormPayload = {
  title: string;
  author: string;
  publisher: string;
  creationDate: string;
  edition: string;
  language: string;
  physicalDescription: string;
  subjects: string;
  contents: string;
  description: string;
  series: string;
  source: string;
  bookType: string;
  mmsId: string;
  nzMmsId: string;
  identifier: string;
  cover: string;
  shelf: string;
};

function readBookField(body: Record<string, unknown>, key: string): string {
  return String(body[key] ?? '').trim();
}

function readBookFormPayload(body: Record<string, unknown>): BookFormPayload {
  return {
    title: readBookField(body, 'title'),
    author: readBookField(body, 'author'),
    publisher: readBookField(body, 'publisher'),
    creationDate: readBookField(body, 'creationDate'),
    edition: readBookField(body, 'edition'),
    language: readBookField(body, 'language'),
    physicalDescription: readBookField(body, 'physicalDescription'),
    subjects: readBookField(body, 'subjects'),
    contents: readBookField(body, 'contents'),
    description: readBookField(body, 'description'),
    series: readBookField(body, 'series'),
    source: readBookField(body, 'source'),
    bookType: readBookField(body, 'bookType'),
    mmsId: readBookField(body, 'mmsId'),
    nzMmsId: readBookField(body, 'nzMmsId'),
    identifier: readBookField(body, 'identifier'),
    cover: readBookField(body, 'cover'),
    shelf: readBookField(body, 'shelf') || 'Unsorted',
  };
}

// ── Login lockout state (in-memory — resets on server restart) ────────────────

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// GET /admin/login

router.get('/login', (req: Request, res: Response) => {
  if (req.isAuthenticated() && (req.user as any)?.role === 'admin') {
    res.redirect('/admin');
    return;
  }
  res.render('pages/admin/login', {
    title: 'Admin Login — CS Library',
    error: null,
  });
});

// POST /admin/login — with lockout after 5 failed attempts

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();

  // Check lockout
  const attempt = loginAttempts.get(email);
  if (attempt && attempt.lockedUntil > Date.now()) {
    const minsLeft = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
    return res.render('pages/admin/login', {
      title: 'Admin Login — CS Library',
      error: `Account locked. Try again in ${minsLeft} minute(s).`,
    });
  }

  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) return next(err);

    if (!user) {
      // Track failed attempt
      const current = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
      current.count++;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
        loginAttempts.set(email, current);
        return res.render('pages/admin/login', {
          title: 'Admin Login — CS Library',
          error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }
      loginAttempts.set(email, current);
      return res.render('pages/admin/login', {
        title: 'Admin Login — CS Library',
        error: info?.message ?? 'Login failed.',
      });
    }

    if (user.role !== 'admin') {
      return res.render('pages/admin/login', {
        title: 'Admin Login — CS Library',
        error: 'You are not authorized to access the admin panel.',
      });
    }

    // Clear lockout on success
    loginAttempts.delete(email);

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.redirect('/admin');
    });
  })(req, res, next);
});

// GET /admin/logout

router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('sessionId');
      res.redirect('/admin/login');
    });
  });
});

// All routes below require admin role
router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin — Dashboard
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const [[userCount], [bookCount], [activeLoanCount], [overdueCount]] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(books),
    db.select({ count: count() }).from(loans).where(eq(loans.returned, false)),
    db.select({ count: count() }).from(loans).where(
      and(eq(loans.returned, false), lt(loans.dueDate, new Date()))
    ),
  ]);

  // Recent activity — last 10 transactions
  const recentActivity = await db
    .select({
      id: loans.id,
      isbn: loans.isbn,
      title: books.title,
      checkedOut: loans.checkedOut,
      dueDate: loans.dueDate,
      returned: loans.returned,
      returnedDate: loans.returnedDate,
      userName: users.name,
    })
    .from(loans)
    .innerJoin(books, eq(loans.isbn, books.isbn))
    .innerJoin(users, eq(loans.userId, users.id))
    .orderBy(desc(loans.checkedOut))
    .limit(10);

  // Popular books (top 5 by checkout count)
  const popularBooks = await db
    .select({
      isbn: books.isbn,
      title: books.title,
      author: books.author,
      checkoutCount: count(loans.id),
    })
    .from(books)
    .leftJoin(loans, eq(books.isbn, loans.isbn))
    .groupBy(books.isbn, books.title, books.author)
    .orderBy(desc(count(loans.id)))
    .limit(5);

  res.render('pages/admin/dashboard', {
    title: 'Admin — CS Library',
    admin: req.user,
    stats: {
      users:       userCount?.count ?? 0,
      books:       bookCount?.count ?? 0,
      activeLoans: activeLoanCount?.count ?? 0,
      overdue:     overdueCount?.count ?? 0,
    },
    recentActivity,
    popularBooks,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/books
router.get('/books', async (_req: Request, res: Response) => {
  const allBooks = await db.select().from(books).orderBy(books.title);
  res.render('pages/admin/books', {
    title: 'Book Management — CS Library Admin',
    books: allBooks,
  });
});

// POST /admin/books/add
router.post('/books/add', async (req: Request, res: Response) => {
  try {
    const isbn   = normalizeIsbn(String(req.body.isbn ?? ''));
    const payload = readBookFormPayload(req.body);

    if (!isbn || !payload.title || !payload.author) {
      return res.status(400).json({ error: 'ISBN, title, and author are required.' });
    }

    // Check for duplicate
    const [existing] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (existing) {
      return res.status(409).json({ error: 'A book with this ISBN already exists.' });
    }

    const [newBook] = await db.insert(books).values({
      isbn,
      ...payload,
      status: 'Available',
    }).returning();

    res.json({ ok: true, book: newBook });
  } catch (err) {
    console.error('[Admin] /books/add error:', err);
    res.status(500).json({ error: 'Failed to add book.' });
  }
});

// POST /admin/books/lookup — Open Library API lookup
router.post('/books/lookup', async (req: Request, res: Response) => {
  try {
    const isbn = normalizeIsbn(String(req.body.isbn ?? ''));
    if (!isbn) return res.status(400).json({ error: 'ISBN is required.' });

    const metadata = await fetchOpenLibraryBookByIsbn(isbn);
    if (!metadata) {
      return res.status(404).json({ error: 'Book not found on Open Library.' });
    }

    res.json(metadata);
  } catch (err) {
    console.error('[Admin] /books/lookup error:', err);
    res.status(500).json({ error: 'Lookup failed.' });
  }
});

// POST /admin/books/enrich — Update an existing catalog entry from Open Library
router.post('/books/enrich', async (req: Request, res: Response) => {
  try {
    const isbn = normalizeIsbn(String(req.body.isbn ?? ''));
    const force = req.body.force === true || req.body.force === 'true';

    if (!isbn) {
      return res.status(400).json({ error: 'ISBN is required.' });
    }

    const [existingBook] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found in the catalog.' });
    }

    const metadata = await fetchOpenLibraryBookByIsbn(isbn);
    if (!metadata) {
      return res.status(404).json({ error: 'Book not found on Open Library.' });
    }

    const update = mergeCatalogBookMetadata(existingBook, metadata, { force });
    if (Object.keys(update).length === 0) {
      return res.json({ ok: true, changed: false, book: existingBook });
    }

    const [updatedBook] = await db
      .update(books)
      .set(update)
      .where(eq(books.isbn, isbn))
      .returning();

    res.json({ ok: true, changed: true, book: updatedBook });
  } catch (err) {
    console.error('[Admin] /books/enrich error:', err);
    res.status(500).json({ error: 'Failed to enrich book metadata.' });
  }
});

// POST /admin/books/edit
router.post('/books/edit', async (req: Request, res: Response) => {
  try {
    const isbn   = normalizeIsbn(String(req.body.isbn ?? ''));
    const payload = readBookFormPayload(req.body);

    if (!isbn || !payload.title || !payload.author) {
      return res.status(400).json({ error: 'ISBN, title, and author are required.' });
    }

    await db.update(books).set(payload).where(eq(books.isbn, isbn));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin] /books/edit error:', err);
    res.status(500).json({ error: 'Failed to update book.' });
  }
});

// POST /admin/books/delete
router.post('/books/delete', async (req: Request, res: Response) => {
  try {
    const isbn = normalizeIsbn(String(req.body.isbn ?? ''));
    // Check if book has active loans
    const [activeLoan] = await db.select().from(loans)
      .where(and(eq(loans.isbn, isbn), eq(loans.returned, false))).limit(1);
    if (activeLoan) {
      return res.status(409).json({ error: 'Cannot delete — book has an active loan.' });
    }
    await db.delete(books).where(eq(books.isbn, isbn));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin] /books/delete error:', err);
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOAN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/loans', async (_req: Request, res: Response) => {
  const allLoans = await db
    .select({
      id:           loans.id,
      isbn:         loans.isbn,
      title:        books.title,
      author:       books.author,
      cover:        books.cover,
      checkedOut:   loans.checkedOut,
      dueDate:      loans.dueDate,
      returned:     loans.returned,
      returnedDate: loans.returnedDate,
      userId:       users.id,
      userName:     users.name,
      userEmail:    users.email,
    })
    .from(loans)
    .innerJoin(books, eq(loans.isbn, books.isbn))
    .innerJoin(users, eq(loans.userId, users.id))
    .orderBy(desc(loans.checkedOut));

  const pendingRenewalRequests = await db
    .select({
      id: renewalRequests.id,
      loanId: renewalRequests.loanId,
      requestedAt: renewalRequests.requestedAt,
      dueDate: loans.dueDate,
      title: books.title,
      author: books.author,
      userName: users.name,
      userEmail: users.email,
    })
    .from(renewalRequests)
    .innerJoin(loans, eq(renewalRequests.loanId, loans.id))
    .innerJoin(books, eq(loans.isbn, books.isbn))
    .innerJoin(users, eq(renewalRequests.userId, users.id))
    .where(eq(renewalRequests.status, 'pending'))
    .orderBy(desc(renewalRequests.requestedAt));

  res.render('pages/admin/loans', {
    title: 'Loan Management — CS Library Admin',
    loans: allLoans,
    renewalRequests: pendingRenewalRequests,
  });
});

// GET /admin/loans/csv — Export to CSV
router.get('/loans/csv', async (_req: Request, res: Response) => {
  const allLoans = await db
    .select({
      isbn: loans.isbn,
      title: books.title,
      userName: users.name,
      userEmail: users.email,
      checkedOut: loans.checkedOut,
      dueDate: loans.dueDate,
      returned: loans.returned,
      returnedDate: loans.returnedDate,
    })
    .from(loans)
    .innerJoin(books, eq(loans.isbn, books.isbn))
    .innerJoin(users, eq(loans.userId, users.id))
    .orderBy(desc(loans.checkedOut));

  const header = 'ISBN,Title,Borrower,Email,Checked Out,Due Date,Returned,Return Date\n';
  const rows = allLoans.map(l => [
    l.isbn,
    `"${(l.title ?? '').replace(/"/g, '""')}"`,
    `"${(l.userName ?? '').replace(/"/g, '""')}"`,
    l.userEmail,
    l.checkedOut ? new Date(l.checkedOut).toISOString().split('T')[0] : '',
    l.dueDate ? new Date(l.dueDate).toISOString().split('T')[0] : '',
    l.returned ? 'Yes' : 'No',
    l.returnedDate ? new Date(l.returnedDate).toISOString().split('T')[0] : '',
  ].join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=loans_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(header + rows);
});

// ─────────────────────────────────────────────────────────────────────────────
// DONATION LOG
// ─────────────────────────────────────────────────────────────────────────────

router.get('/donations', async (_req: Request, res: Response) => {
  const donationRows = await db
    .select({
      id: donations.id,
      isbn: donations.isbn,
      title: donations.title,
      author: donations.author,
      status: donations.status,
      donorName: donations.donorName,
      donorEmail: donations.donorEmail,
      donorUserName: users.name,
      donorUserEmail: users.email,
      reviewedAt: donations.reviewedAt,
      reviewNote: donations.reviewNote,
      createdAt: donations.createdAt,
    })
    .from(donations)
    .leftJoin(users, eq(donations.donorUserId, users.id))
    .orderBy(desc(donations.createdAt));

  res.render('pages/admin/donations', {
    title: 'Donation Log — CS Library Admin',
    donations: donationRows,
  });
});

router.post('/donations/update', async (req: Request, res: Response) => {
  try {
    const donationId = Number(req.body.id);
    const status = String(req.body.status ?? '');
    const reviewNote = String(req.body.reviewNote ?? '').trim();
    const adminUserId = Number((req.user as any)?.id);

    if (!donationId || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid donation update.' });
    }

    const [donation] = await db
      .select({
        id: donations.id,
        isbn: donations.isbn,
        title: donations.title,
        author: donations.author,
        status: donations.status,
        donorName: donations.donorName,
        donorEmail: donations.donorEmail,
      })
      .from(donations)
      .where(eq(donations.id, donationId))
      .limit(1);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    if (donation.status !== 'pending') {
      return res.status(409).json({ error: 'This donation has already been reviewed.' });
    }

    if (status === 'rejected') {
      const [activeLoan] = await db
        .select({ id: loans.id })
        .from(loans)
        .where(and(eq(loans.isbn, donation.isbn), eq(loans.returned, false)))
        .limit(1);

      const [activeHold] = await db
        .select({ id: holds.id })
        .from(holds)
        .where(and(
          eq(holds.isbn, donation.isbn),
          or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
        ))
        .limit(1);

      if (activeLoan || activeHold) {
        return res.status(409).json({ error: 'Cannot reject a donation once the book is in circulation.' });
      }

      await db.delete(books).where(eq(books.isbn, donation.isbn));
    }

    await db
      .update(donations)
      .set({
        status,
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId || null,
        reviewNote,
      })
      .where(eq(donations.id, donationId));

    if (donation.donorEmail) {
      void sendDonationStatusEmail({
        to: donation.donorEmail,
        name: donation.donorName,
        title: donation.title,
        author: donation.author,
        status,
      })
        .then((emailResult) => {
          if (!emailResult.success) {
            console.warn(`[Admin] Donation status email was not delivered for ${donation.donorEmail}.`);
          }
        })
        .catch((error) => {
          console.error('[Admin] Donation status email failed:', error);
        });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin] /donations/update error:', err);
    res.status(500).json({ error: 'Failed to update donation.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/users', async (_req: Request, res: Response) => {
  const allUsers = await db
    .select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      studentId: users.studentId,
      role:      users.role,
      active:    users.active,
      borrowingLimit: users.borrowingLimit,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Get loan counts per user
  const loanCounts = await db
    .select({
      userId: loans.userId,
      total: count(),
    })
    .from(loans)
    .where(eq(loans.returned, false))
    .groupBy(loans.userId);

  const loanMap = new Map(loanCounts.map(l => [l.userId, l.total]));
  const usersWithLoans = allUsers.map(u => ({
    ...u,
    activeLoans: loanMap.get(u.id) ?? 0,
  }));

  res.render('pages/admin/users', {
    title: 'User Management — CS Library Admin',
    users: usersWithLoans,
  });
});

// POST /admin/users/toggle — Enable/disable a user
router.post('/users/toggle', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.body.userId);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await db.update(users).set({ active: !user.active, updatedAt: new Date() }).where(eq(users.id, userId));
    res.json({ ok: true, active: !user.active });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// POST /admin/users/set-role
router.post('/users/set-role', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.body.userId);
    const role   = String(req.body.role ?? 'user');
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.role === 'admin' && role === 'user') {
      return res.status(403).json({ error: 'Admin accounts cannot be demoted through the dashboard.' });
    }

    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// POST /admin/users/set-limit
router.post('/users/set-limit', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.body.userId);
    const borrowingLimit = Number(req.body.borrowingLimit);

    if (!userId) {
      return res.status(400).json({ error: 'User is required.' });
    }

    if (!Number.isInteger(borrowingLimit) || borrowingLimit < 1 || borrowingLimit > 25) {
      return res.status(400).json({ error: 'Borrowing limit must be between 1 and 25.' });
    }

    await db
      .update(users)
      .set({ borrowingLimit, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ ok: true, borrowingLimit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update borrowing limit.' });
  }
});

// GET /admin/users/:id/history
router.get('/users/:id/history', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params['id']);
    const history = await db
      .select({
        isbn: loans.isbn,
        title: books.title,
        checkedOut: loans.checkedOut,
        dueDate: loans.dueDate,
        returned: loans.returned,
        returnedDate: loans.returnedDate,
      })
      .from(loans)
      .innerJoin(books, eq(loans.isbn, books.isbn))
      .where(eq(loans.userId, userId))
      .orderBy(desc(loans.checkedOut))
      .limit(50);

    res.json({ loans: history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USAGE REPORTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/reports', async (_req: Request, res: Response) => {
  // Monthly stats (last 12 months)
  const monthlyStats = await db
    .select({
      month: sql<string>`to_char(${loans.checkedOut}, 'YYYY-MM')`,
      checkouts: count(),
    })
    .from(loans)
    .where(gt(loans.checkedOut, sql`NOW() - INTERVAL '12 months'`))
    .groupBy(sql`to_char(${loans.checkedOut}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${loans.checkedOut}, 'YYYY-MM')`);

  // Most popular books
  const popular = await db
    .select({
      isbn: books.isbn,
      title: books.title,
      author: books.author,
      cover: books.cover,
      checkoutCount: count(loans.id),
    })
    .from(books)
    .leftJoin(loans, eq(books.isbn, loans.isbn))
    .groupBy(books.isbn, books.title, books.author, books.cover)
    .orderBy(desc(count(loans.id)))
    .limit(10);

  // Day of week usage
  const dayOfWeek = await db
    .select({
      day: sql<string>`to_char(${loans.checkedOut}, 'Day')`,
      dayNum: sql<number>`EXTRACT(DOW FROM ${loans.checkedOut})`,
      checkouts: count(),
    })
    .from(loans)
    .groupBy(sql`to_char(${loans.checkedOut}, 'Day')`, sql`EXTRACT(DOW FROM ${loans.checkedOut})`)
    .orderBy(sql`EXTRACT(DOW FROM ${loans.checkedOut})`);

  // Hour of day usage
  const hourOfDay = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${loans.checkedOut})`,
      checkouts: count(),
    })
    .from(loans)
    .groupBy(sql`EXTRACT(HOUR FROM ${loans.checkedOut})`)
    .orderBy(sql`EXTRACT(HOUR FROM ${loans.checkedOut})`);

  res.render('pages/admin/reports', {
    title: 'Usage Reports — CS Library Admin',
    monthlyStats,
    popular,
    dayOfWeek,
    hourOfDay,
  });
});

// GET /admin/reports/csv
router.get('/reports/csv', async (_req: Request, res: Response) => {
  const popular = await db
    .select({
      isbn: books.isbn,
      title: books.title,
      author: books.author,
      checkoutCount: count(loans.id),
    })
    .from(books)
    .leftJoin(loans, eq(books.isbn, loans.isbn))
    .groupBy(books.isbn, books.title, books.author)
    .orderBy(desc(count(loans.id)));

  const header = 'ISBN,Title,Author,Checkout Count\n';
  const rows = popular.map(b => [
    b.isbn,
    `"${(b.title ?? '').replace(/"/g, '""')}"`,
    `"${(b.author ?? '').replace(/"/g, '""')}"`,
    b.checkoutCount,
  ].join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=report_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(header + rows);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTIONS REVIEW
// ─────────────────────────────────────────────────────────────────────────────

router.get('/suggestions', async (_req: Request, res: Response) => {
  const allSuggestions = await db
    .select({
      id:        suggestions.id,
      title:     suggestions.title,
      author:    suggestions.author,
      reason:    suggestions.reason,
      status:    suggestions.status,
      createdAt: suggestions.createdAt,
      userName:  users.name,
      userEmail: users.email,
    })
    .from(suggestions)
    .innerJoin(users, eq(suggestions.userId, users.id))
    .orderBy(desc(suggestions.createdAt));

  res.render('pages/admin/suggestions', {
    title: 'Book Suggestions — CS Library Admin',
    suggestions: allSuggestions,
  });
});

// POST /admin/suggestions/update
router.post('/suggestions/update', async (req: Request, res: Response) => {
  try {
    const id     = Number(req.body.id);
    const status = String(req.body.status ?? '');
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const [suggestion] = await db
      .select({
        id: suggestions.id,
        title: suggestions.title,
        author: suggestions.author,
        userName: users.name,
        userEmail: users.email,
      })
      .from(suggestions)
      .innerJoin(users, eq(suggestions.userId, users.id))
      .where(eq(suggestions.id, id))
      .limit(1);

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found.' });
    }

    await db.update(suggestions).set({ status }).where(eq(suggestions.id, id));

    void sendSuggestionStatusEmail({
      to: suggestion.userEmail,
      name: suggestion.userName,
      title: suggestion.title,
      author: suggestion.author,
      status,
    })
      .then((emailResult) => {
        if (!emailResult.success) {
          console.warn(`[Admin] Suggestion status email was not delivered for ${suggestion.userEmail}.`);
        }
      })
      .catch((error) => {
        console.error('[Admin] Suggestion status email failed:', error);
      });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update suggestion.' });
  }
});

router.post('/loans/renewals/update', async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.body.id);
    const status = String(req.body.status ?? '');
    const adminUserId = Number((req.user as any)?.id);

    if (!requestId || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid renewal update.' });
    }

    const [requestRow] = await db
      .select({
        id: renewalRequests.id,
        loanId: renewalRequests.loanId,
        status: renewalRequests.status,
        isbn: loans.isbn,
        dueDate: loans.dueDate,
        returned: loans.returned,
        title: books.title,
        author: books.author,
        userName: users.name,
        userEmail: users.email,
      })
      .from(renewalRequests)
      .innerJoin(loans, eq(renewalRequests.loanId, loans.id))
      .innerJoin(books, eq(loans.isbn, books.isbn))
      .innerJoin(users, eq(renewalRequests.userId, users.id))
      .where(eq(renewalRequests.id, requestId))
      .limit(1);

    if (!requestRow || requestRow.status !== 'pending') {
      return res.status(404).json({ error: 'Pending extension request not found.' });
    }

    if (requestRow.returned) {
      return res.status(409).json({ error: 'This loan has already been returned.' });
    }

    if (status === 'approved') {
      const [activeHold] = await db
        .select({ id: holds.id })
        .from(holds)
        .where(and(
          eq(holds.isbn, requestRow.isbn),
          or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
        ))
        .limit(1);

      if (activeHold) {
        return res.status(409).json({ error: 'This book has an active hold and cannot be extended.' });
      }

      const newDueDate = addDays(new Date(requestRow.dueDate), 14);
      await db.update(loans).set({ dueDate: newDueDate }).where(eq(loans.id, requestRow.loanId));

      await db
        .update(renewalRequests)
        .set({
          status,
          reviewedAt: new Date(),
          reviewedByUserId: adminUserId || null,
        })
        .where(eq(renewalRequests.id, requestId));

      void sendRenewalRequestStatusEmail({
        to: requestRow.userEmail,
        name: requestRow.userName,
        title: requestRow.title,
        author: requestRow.author,
        status,
        dueDate: newDueDate,
      })
        .then((emailResult) => {
          if (!emailResult.success) {
            console.warn(`[Admin] Renewal approval email was not delivered for ${requestRow.userEmail}.`);
          }
        })
        .catch((error) => {
          console.error('[Admin] Renewal approval email failed:', error);
        });

      return res.json({ ok: true, dueDate: newDueDate });
    }

    await db
      .update(renewalRequests)
      .set({
        status,
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId || null,
      })
      .where(eq(renewalRequests.id, requestId));

    void sendRenewalRequestStatusEmail({
      to: requestRow.userEmail,
      name: requestRow.userName,
      title: requestRow.title,
      author: requestRow.author,
      status,
      dueDate: requestRow.dueDate,
    })
      .then((emailResult) => {
        if (!emailResult.success) {
          console.warn(`[Admin] Renewal rejection email was not delivered for ${requestRow.userEmail}.`);
        }
      })
      .catch((error) => {
        console.error('[Admin] Renewal rejection email failed:', error);
      });

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin] /loans/renewals/update error:', err);
    res.status(500).json({ error: 'Failed to update extension request.' });
  }
});

export default router;
