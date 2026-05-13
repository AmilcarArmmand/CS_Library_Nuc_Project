// src/routes/reviewAdmin.ts
// Admin review management — mounted at /admin/reviews in app.ts.
//
// GET  /admin/reviews          — list all reviews (filterable by type/status)
// POST /admin/reviews/:id/delete   — soft-delete a review
// POST /admin/reviews/:id/restore  — restore a soft-deleted review

import express from 'express';
import type { Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { reviews, users, books, equipment } from '../db/schema/schema.js';
import { eq, and, isNull, isNotNull, desc, inArray } from 'drizzle-orm';

const router = express.Router();
router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/reviews
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const filterType   = String(req.query['type']   ?? 'all');   // 'all' | 'book' | 'equipment'
    const filterStatus = String(req.query['status'] ?? 'live');  // 'live' | 'deleted'

    let whereClause;
    if (filterStatus === 'deleted') {
      whereClause = isNotNull(reviews.deletedAt);
    } else {
      whereClause = isNull(reviews.deletedAt);
    }

    const allReviews = await db
      .select({
        id:         reviews.id,
        targetType: reviews.targetType,
        targetId:   reviews.targetId,
        rating:     reviews.rating,
        body:       reviews.body,
        createdAt:  reviews.createdAt,
        updatedAt:  reviews.updatedAt,
        deletedAt:  reviews.deletedAt,
        userId:     reviews.userId,
        userName:   users.name,
        userEmail:  users.email,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt));

    // Apply type filter after fetch (simple — table is small)
    const filtered = filterType === 'all'
      ? allReviews
      : allReviews.filter(r => r.targetType === filterType);

    // Enrich with item names
    const bookIsbns = filtered.filter(r => r.targetType === 'book').map(r => r.targetId);
    const equipIds  = filtered.filter(r => r.targetType === 'equipment').map(r => Number(r.targetId));

    const bookMap  = new Map<string, string>();
    const equipMap = new Map<number, string>();

    if (bookIsbns.length) {
      const rows = await db
        .select({ isbn: books.isbn, title: books.title })
        .from(books)
        .where(inArray(books.isbn, bookIsbns));
      rows.forEach(b => bookMap.set(b.isbn, b.title));
    }

    if (equipIds.length) {
      const rows = await db
        .select({ id: equipment.id, name: equipment.name })
        .from(equipment)
        .where(inArray(equipment.id, equipIds));
      rows.forEach(e => equipMap.set(e.id, e.name));
    }

    const enriched = filtered.map(r => ({
      ...r,
      itemName: r.targetType === 'book'
        ? (bookMap.get(r.targetId) ?? 'Unknown Book')
        : (equipMap.get(Number(r.targetId)) ?? 'Unknown Item'),
    }));

    res.render('pages/admin/reviews', {
      title:        'Review Management — CS Library Admin',
      admin:        req.user,
      reviewList:   enriched,
      filterType,
      filterStatus,
      total:        enriched.length,
    });
  } catch (err) {
    console.error('[Admin Reviews] GET / error:', err);
    res.status(500).render('pages/error', { title: 'Error', error: 'Could not load reviews.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reviews/:id/delete  — soft-delete
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:id/delete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params['id'] ?? ''), 10);
    if (!id) { res.status(400).json({ error: 'Invalid ID.' }); return; }

    await db
      .update(reviews)
      .set({ deletedAt: new Date() })
      .where(eq(reviews.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Reviews] /delete error:', err);
    res.status(500).json({ error: 'Could not delete review.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reviews/:id/restore  — restore soft-deleted
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params['id'] ?? ''), 10);
    if (!id) { res.status(400).json({ error: 'Invalid ID.' }); return; }

    await db
      .update(reviews)
      .set({ deletedAt: null })
      .where(eq(reviews.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Reviews] /restore error:', err);
    res.status(500).json({ error: 'Could not restore review.' });
  }
});

export default router;
