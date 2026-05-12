import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { books, loans, holds, suggestions, renewalRequests, users, equipment, equipmentUnits, equipmentLoans } from '../db/schema/schema.js';
import { eq, desc, and, or } from 'drizzle-orm';
import { normalizeIsbn } from '../utils/openLibrary.js';
import { sendRenewalRequestReceivedEmail } from '../utils/emailService.js';

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
    const userId = (req.user as any)?.id ?? null;
    const allBooks = await db.select().from(books).orderBy(books.title);

    // Get active loans to find who has each checked-out book
    const activeLoans = await db
      .select({ isbn: loans.isbn, userId: loans.userId })
      .from(loans)
      .where(eq(loans.returned, false));

    const borrowerMap = new Map(activeLoans.map(l => [l.isbn, l.userId]));

    const activeHolds = userId
      ? await db
          .select({ isbn: holds.isbn })
          .from(holds)
          .where(and(
            eq(holds.userId, userId),
            or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
          ))
      : [];

    const heldIsbns = new Set(activeHolds.map(h => h.isbn));

    const enriched = allBooks.map(b => ({
      ...b,
      borrowerUserId: borrowerMap.get(b.isbn) ?? null,
      heldByCurrentUser: heldIsbns.has(b.isbn),
    }));

    res.json({ books: enriched, currentUserId: userId });
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

    const requestRows = await db
      .select({
        loanId: renewalRequests.loanId,
        status: renewalRequests.status,
        requestedAt: renewalRequests.requestedAt,
      })
      .from(renewalRequests)
      .where(eq(renewalRequests.userId, userId))
      .orderBy(desc(renewalRequests.requestedAt));

    const renewalStatusByLoan = new Map<number, string>();
    for (const request of requestRows) {
      if (!renewalStatusByLoan.has(request.loanId)) {
        renewalStatusByLoan.set(request.loanId, request.status);
      }
    }

    const enrichedRows = rows.map((loan) => ({
      ...loan,
      renewalRequestStatus: renewalStatusByLoan.get(loan.id) ?? null,
    }));

    res.json({ loans: enrichedRows });
  } catch (err) {
    console.error('[WebDashboard] /api/my-loans error:', err);
    res.status(500).json({ error: 'Could not fetch loans.' });
  }
});

// POST /web-dashboard/api/hold — Place a hold on a checked-out book

router.post('/api/hold', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id as number;
    const isbn   = normalizeIsbn(String(req.body.isbn ?? ''));

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
      .where(and(
        eq(holds.userId, userId),
        eq(holds.isbn, isbn),
        or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
      ))
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

// POST /web-dashboard/api/renewal-request — Request a due-date extension

router.post('/api/renewal-request', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id as number;
    const loanId = Number(req.body.loanId);

    if (!loanId) {
      res.status(400).json({ error: 'loanId is required.' });
      return;
    }

    const [loan] = await db
      .select({
        id: loans.id,
        userId: loans.userId,
        isbn: loans.isbn,
        dueDate: loans.dueDate,
        returned: loans.returned,
        title: books.title,
        author: books.author,
        userName: users.name,
        userEmail: users.email,
      })
      .from(loans)
      .innerJoin(books, eq(loans.isbn, books.isbn))
      .innerJoin(users, eq(loans.userId, users.id))
      .where(eq(loans.id, loanId))
      .limit(1);

    if (!loan || loan.userId !== userId || loan.returned) {
      res.status(404).json({ error: 'Active loan not found.' });
      return;
    }

    if (loan.dueDate < new Date()) {
      res.status(409).json({ error: 'Overdue books cannot request an extension.' });
      return;
    }

    const [activeHold] = await db
      .select({ id: holds.id })
      .from(holds)
      .where(and(
        eq(holds.isbn, loan.isbn),
        or(eq(holds.status, 'pending'), eq(holds.status, 'ready')),
      ))
      .limit(1);

    if (activeHold) {
      res.status(409).json({ error: 'This book has an active hold and cannot be extended.' });
      return;
    }

    const [existingPending] = await db
      .select({ id: renewalRequests.id })
      .from(renewalRequests)
      .where(and(eq(renewalRequests.loanId, loanId), eq(renewalRequests.status, 'pending')))
      .limit(1);

    if (existingPending) {
      res.status(409).json({ error: 'An extension request is already pending for this book.' });
      return;
    }

    const [requestRow] = await db.insert(renewalRequests).values({
      loanId,
      userId,
      status: 'pending',
    }).returning();

    void sendRenewalRequestReceivedEmail({
      to: loan.userEmail,
      name: loan.userName,
      title: loan.title,
      author: loan.author,
      dueDate: loan.dueDate,
    })
      .then((emailResult) => {
        if (!emailResult.success) {
          console.warn(`[WebDashboard] Renewal request email was not delivered for ${loan.userEmail}.`);
        }
      })
      .catch((error) => {
        console.error('[WebDashboard] Renewal request email failed:', error);
      });

    res.json({ ok: true, request: requestRow });
  } catch (err) {
    console.error('[WebDashboard] /api/renewal-request error:', err);
    res.status(500).json({ error: 'Failed to submit extension request.' });
  }
});

// GET /web-dashboard/api/equipment-catalog
// Returns all equipment types with their unit availability summary.

router.get('/api/equipment-catalog', async (req: Request, res: Response) => {
  try {
    const allEquipment = await db
      .select()
      .from(equipment)
      .orderBy(equipment.name);

    const allUnits = await db
      .select({
        id:          equipmentUnits.id,
        equipmentId: equipmentUnits.equipmentId,
        status:      equipmentUnits.status,
        condition:   equipmentUnits.condition,
      })
      .from(equipmentUnits)
      .where(eq(equipmentUnits.status, 'Available'));

    // Count available units per equipment type
    const availableByType = new Map<number, number>();
    for (const unit of allUnits) {
      availableByType.set(
        unit.equipmentId,
        (availableByType.get(unit.equipmentId) ?? 0) + 1,
      );
    }

    const enriched = allEquipment.map(item => ({
      ...item,
      availableUnits: availableByType.get(item.id) ?? 0,
    }));

    res.json({ equipment: enriched });
  } catch (err) {
    console.error('[WebDashboard] /api/equipment-catalog error:', err);
    res.status(500).json({ error: 'Could not load equipment catalog.' });
  }
});

// GET /web-dashboard/api/my-equipment-loans
// Returns the logged-in user's active equipment loans.

router.get('/api/my-equipment-loans', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id as number;

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
    console.error('[WebDashboard] /api/my-equipment-loans error:', err);
    res.status(500).json({ error: 'Could not fetch equipment loans.' });
  }
});

export default router;
