import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { books, loans, holds, users, suggestions, equipment, equipmentUnits, equipmentLoans, renewalRequests, reviews } from '../db/schema/schema.js';
import { eq, desc, and, or, isNull, inArray } from 'drizzle-orm';
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

router.get('/api/equipment-catalog', async (_req: Request, res: Response) => {
  try {
    const allEquipment = await db.select().from(equipment).orderBy(equipment.name);

    const allUnits = await db
      .select({
        equipmentId: equipmentUnits.equipmentId,
        status:      equipmentUnits.status,
        condition:   equipmentUnits.condition,
      })
      .from(equipmentUnits);

    const byType = new Map<number, { total: number; available: number; conditions: string[] }>();
    for (const unit of allUnits) {
      const cur = byType.get(unit.equipmentId) ?? { total: 0, available: 0, conditions: [] };
      cur.total++;
      if (unit.status === 'Available') cur.available++;
      cur.conditions.push(unit.condition);
      byType.set(unit.equipmentId, cur);
    }

    const enriched = allEquipment.map(item => {
      const data = byType.get(item.id) ?? { total: 0, available: 0, conditions: [] };
      const condCount = { Good: 0, Fair: 0, Poor: 0 };
      for (const c of data.conditions) {
        if (c === 'Good' || c === 'Fair' || c === 'Poor') condCount[c]++;
      }
      return {
        ...item,
        totalUnits:       data.total,
        availableUnits:   data.available,
        conditionSummary: condCount,
      };
    });

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

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

// GET /web-dashboard/api/reviews/:type/:id
// Fetch all visible reviews for a book (type=book, id=isbn) or equipment (type=equipment, id=equipId)
// Also returns the current user's own review if logged in.

router.get('/api/reviews/:type/:id', async (req: Request, res: Response) => {
  try {
    const targetType = String(req.params['type'] ?? '');
    const targetId   = String(req.params['id']   ?? '');

    if (!['book', 'equipment'].includes(targetType) || !targetId) {
      res.status(400).json({ error: 'Invalid target.' }); return;
    }

    const allReviews = await db
      .select({
        id:        reviews.id,
        userId:    reviews.userId,
        rating:    reviews.rating,
        body:      reviews.body,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        userName:  users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.targetType, targetType),
          eq(reviews.targetId, targetId),
          isNull(reviews.deletedAt),
        )
      )
      .orderBy(desc(reviews.createdAt));

    const currentUserId = (req.user as any)?.id ?? null;
    const myReview = currentUserId
      ? allReviews.find(r => r.userId === currentUserId) ?? null
      : null;

    const avgRating = allReviews.length
      ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
      : null;

    res.json({
      reviews:   allReviews,
      myReview,
      avgRating,
      total:     allReviews.length,
    });
  } catch (err) {
    console.error('[Reviews] GET error:', err);
    res.status(500).json({ error: 'Could not load reviews.' });
  }
});

// POST /web-dashboard/api/reviews
// Submit or update the current user's review for a book or equipment item.
// One review per user per item — submitting again overwrites the previous one.

router.post('/api/reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId     = (req.user as any).id as number;
    const targetType = String(req.body.targetType ?? '').trim();
    const targetId   = String(req.body.targetId   ?? '').trim();
    const rating     = parseInt(String(req.body.rating ?? ''), 10);
    const body       = String(req.body.body ?? '').trim().slice(0, 2000);

    if (!['book', 'equipment'].includes(targetType) || !targetId) {
      res.status(400).json({ error: 'Invalid target type or ID.' }); return;
    }
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5.' }); return;
    }

    // Check for existing review (including soft-deleted — user can re-review)
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          eq(reviews.targetType, targetType),
          eq(reviews.targetId, targetId),
        )
      )
      .limit(1);

    let review;
    if (existing) {
      // Update existing review, restore if it was soft-deleted
      [review] = await db
        .update(reviews)
        .set({ rating, body, updatedAt: new Date(), deletedAt: null })
        .where(eq(reviews.id, existing.id))
        .returning();
    } else {
      [review] = await db
        .insert(reviews)
        .values({ userId, targetType, targetId, rating, body })
        .returning();
    }

    res.json({ ok: true, review });
  } catch (err) {
    console.error('[Reviews] POST error:', err);
    res.status(500).json({ error: 'Could not save review.' });
  }
});

// DELETE /web-dashboard/api/reviews/:id
// User deletes their own review (hard delete — it's their own content).

router.delete('/api/reviews/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId   = (req.user as any).id as number;
    const reviewId = parseInt(String(req.params['id'] ?? ''), 10);
    if (!reviewId) { res.status(400).json({ error: 'Invalid review ID.' }); return; }

    const [review] = await db
      .select({ id: reviews.id, userId: reviews.userId })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!review)               { res.status(404).json({ error: 'Review not found.' }); return; }
    if (review.userId !== userId) { res.status(403).json({ error: 'You can only delete your own reviews.' }); return; }

    await db.delete(reviews).where(eq(reviews.id, reviewId));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Reviews] DELETE error:', err);
    res.status(500).json({ error: 'Could not delete review.' });
  }
});

// GET /web-dashboard/api/my-reviews
// Returns all reviews written by the current user, enriched with item title/name.

router.get('/api/my-reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id as number;

    const allReviews = await db
      .select({
        id:         reviews.id,
        targetType: reviews.targetType,
        targetId:   reviews.targetId,
        rating:     reviews.rating,
        body:       reviews.body,
        createdAt:  reviews.createdAt,
        updatedAt:  reviews.updatedAt,
      })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), isNull(reviews.deletedAt)))
      .orderBy(desc(reviews.createdAt));

    // Enrich with item names
    const bookIsbns   = allReviews.filter(r => r.targetType === 'book').map(r => r.targetId);
    const equipIds    = allReviews.filter(r => r.targetType === 'equipment').map(r => Number(r.targetId));

    const bookMap  = new Map<string, string>();
    const equipMap = new Map<number, string>();

    if (bookIsbns.length) {
      const bookRows = await db
        .select({ isbn: books.isbn, title: books.title })
        .from(books)
        .where(inArray(books.isbn, bookIsbns));
      bookRows.forEach(b => bookMap.set(b.isbn, b.title));
    }

    if (equipIds.length) {
      const equipRows = await db
        .select({ id: equipment.id, name: equipment.name })
        .from(equipment)
        .where(inArray(equipment.id, equipIds));
      equipRows.forEach(e => equipMap.set(e.id, e.name));
    }

    const enriched = allReviews.map(r => ({
      ...r,
      itemName: r.targetType === 'book'
        ? (bookMap.get(r.targetId) ?? 'Unknown Book')
        : (equipMap.get(Number(r.targetId)) ?? 'Unknown Item'),
    }));

    res.json({ reviews: enriched });
  } catch (err) {
    console.error('[Reviews] GET my-reviews error:', err);
    res.status(500).json({ error: 'Could not load your reviews.' });
  }
});

export default router;
