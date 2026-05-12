// src/routes/equipmentAdmin.ts
// Admin equipment management — mounted at /admin/equipment in app.ts.
//
//   GET  /admin/equipment               → Equipment catalog page
//   POST /admin/equipment/add           → Add a new equipment type
//   POST /admin/equipment/edit          → Edit an equipment type
//   POST /admin/equipment/delete        → Delete a type (blocked if active loans)
//   POST /admin/equipment/units/add     → Register a physical unit with a barcode
//   POST /admin/equipment/units/edit    → Update condition / status / notes on a unit
//   POST /admin/equipment/units/delete  → Delete a unit (blocked if on active loan)
//   POST /admin/equipment/loans/return  → Manually check a unit back in

import express from 'express';
import type { Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db/database.js';
import {
  equipment,
  equipmentUnits,
  equipmentLoans,
  users,
} from '../db/schema/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { addDays } from 'date-fns';

const router = express.Router();

// All equipment admin routes require admin role
router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/equipment
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const allEquipment = await db
      .select()
      .from(equipment)
      .orderBy(equipment.name);

    const allUnits = await db
      .select()
      .from(equipmentUnits)
      .orderBy(equipmentUnits.barcode);

    // Active loans with borrower info
    const activeLoans = await db
      .select({
        id:         equipmentLoans.id,
        unitId:     equipmentLoans.unitId,
        checkedOut: equipmentLoans.checkedOut,
        dueDate:    equipmentLoans.dueDate,
        userName:   users.name,
        userEmail:  users.email,
        studentId:  users.studentId,
      })
      .from(equipmentLoans)
      .innerJoin(users, eq(equipmentLoans.userId, users.id))
      .where(eq(equipmentLoans.returned, false))
      .orderBy(desc(equipmentLoans.checkedOut));

    const loanByUnitId = new Map(activeLoans.map(l => [l.unitId, l]));

    const equipmentList = allEquipment.map(item => {
      const units = allUnits
        .filter(u => u.equipmentId === item.id)
        .map(u => ({
          ...u,
          activeLoan: loanByUnitId.get(u.id) ?? null,
        }));

      return {
        ...item,
        units,
        totalUnits:     units.length,
        availableUnits: units.filter(u => u.status === 'Available').length,
        activeLoans:    units.filter(u => u.activeLoan !== null).length,
      };
    });

    res.render('pages/admin/equipment', {
      title: 'Equipment Management — CS Library Admin',
      equipmentList,
    });
  } catch (err) {
    console.error('[Admin Equipment] GET / error:', err);
    res.status(500).render('pages/error', { title: 'Error', error: 'Could not load equipment page.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT TYPE CRUD
// ─────────────────────────────────────────────────────────────────────────────

// POST /admin/equipment/add
router.post('/add', async (req: Request, res: Response) => {
  try {
    const name            = String(req.body.name            ?? '').trim();
    const description     = String(req.body.description     ?? '').trim();
    const category        = String(req.body.category        ?? '').trim();
    const image           = String(req.body.image           ?? '').trim();
    const loanDurationDays = Math.max(1, parseInt(String(req.body.loanDurationDays ?? '7'), 10) || 7);

    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const [newItem] = await db
      .insert(equipment)
      .values({ name, description, category, image, loanDurationDays })
      .returning();

    res.json({ ok: true, equipment: newItem });
  } catch (err) {
    console.error('[Admin Equipment] /add error:', err);
    res.status(500).json({ error: 'Failed to add equipment.' });
  }
});

// POST /admin/equipment/edit
router.post('/edit', async (req: Request, res: Response) => {
  try {
    const id              = parseInt(String(req.body.id ?? ''), 10);
    const name            = String(req.body.name            ?? '').trim();
    const description     = String(req.body.description     ?? '').trim();
    const category        = String(req.body.category        ?? '').trim();
    const image           = String(req.body.image           ?? '').trim();
    const loanDurationDays = Math.max(1, parseInt(String(req.body.loanDurationDays ?? '7'), 10) || 7);

    if (!id || !name) {
      return res.status(400).json({ error: 'ID and name are required.' });
    }

    await db
      .update(equipment)
      .set({ name, description, category, image, loanDurationDays, updatedAt: new Date() })
      .where(eq(equipment.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /edit error:', err);
    res.status(500).json({ error: 'Failed to update equipment.' });
  }
});

// POST /admin/equipment/delete
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.body.id ?? ''), 10);
    if (!id) return res.status(400).json({ error: 'ID is required.' });

    // Block delete if any unit of this type has an active loan
    const [activeLoan] = await db
      .select({ id: equipmentLoans.id })
      .from(equipmentLoans)
      .innerJoin(equipmentUnits, eq(equipmentLoans.unitId, equipmentUnits.id))
      .where(
        and(
          eq(equipmentUnits.equipmentId, id),
          eq(equipmentLoans.returned, false),
        ),
      )
      .limit(1);

    if (activeLoan) {
      return res.status(409).json({ error: 'Cannot delete — this equipment type has active loans.' });
    }

    // onDelete: cascade handles the units rows
    await db.delete(equipment).where(eq(equipment.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /delete error:', err);
    res.status(500).json({ error: 'Failed to delete equipment.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT CRUD
// ─────────────────────────────────────────────────────────────────────────────

// POST /admin/equipment/units/add
router.post('/units/add', async (req: Request, res: Response) => {
  try {
    const equipmentId = parseInt(String(req.body.equipmentId ?? ''), 10);
    const barcode     = String(req.body.barcode   ?? '').trim().toUpperCase();
    const condition   = String(req.body.condition ?? 'Good').trim();
    const notes       = String(req.body.notes     ?? '').trim();

    if (!equipmentId || !barcode) {
      return res.status(400).json({ error: 'Equipment ID and barcode are required.' });
    }

    const validConditions = ['Good', 'Fair', 'Poor'];
    if (!validConditions.includes(condition)) {
      return res.status(400).json({ error: 'Invalid condition value.' });
    }

    // Barcode must be unique across all units
    const [existing] = await db
      .select({ id: equipmentUnits.id })
      .from(equipmentUnits)
      .where(eq(equipmentUnits.barcode, barcode))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: `Barcode "${barcode}" is already registered to another unit.` });
    }

    const [newUnit] = await db
      .insert(equipmentUnits)
      .values({ equipmentId, barcode, condition, notes, status: 'Available' })
      .returning();

    res.json({ ok: true, unit: newUnit });
  } catch (err) {
    console.error('[Admin Equipment] /units/add error:', err);
    res.status(500).json({ error: 'Failed to add unit.' });
  }
});

// POST /admin/equipment/units/edit
router.post('/units/edit', async (req: Request, res: Response) => {
  try {
    const id        = parseInt(String(req.body.id        ?? ''), 10);
    const condition = String(req.body.condition ?? '').trim();
    const status    = String(req.body.status    ?? '').trim();
    const notes     = String(req.body.notes     ?? '').trim();

    if (!id) return res.status(400).json({ error: 'Unit ID is required.' });

    const validConditions = ['Good', 'Fair', 'Poor'];
    const validStatuses   = ['Available', 'Checked Out', 'Maintenance', 'Retired'];

    if (condition && !validConditions.includes(condition)) {
      return res.status(400).json({ error: 'Invalid condition.' });
    }
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    await db
      .update(equipmentUnits)
      .set({
        ...(condition ? { condition } : {}),
        ...(status    ? { status }    : {}),
        notes,
      })
      .where(eq(equipmentUnits.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /units/edit error:', err);
    res.status(500).json({ error: 'Failed to update unit.' });
  }
});

// POST /admin/equipment/units/delete
router.post('/units/delete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.body.id ?? ''), 10);
    if (!id) return res.status(400).json({ error: 'Unit ID is required.' });

    const [activeLoan] = await db
      .select({ id: equipmentLoans.id })
      .from(equipmentLoans)
      .where(and(eq(equipmentLoans.unitId, id), eq(equipmentLoans.returned, false)))
      .limit(1);

    if (activeLoan) {
      return res.status(409).json({ error: 'Cannot delete — this unit is currently on loan.' });
    }

    await db.delete(equipmentUnits).where(eq(equipmentUnits.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /units/delete error:', err);
    res.status(500).json({ error: 'Failed to delete unit.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOAN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// POST /admin/equipment/loans/return
router.post('/loans/return', async (req: Request, res: Response) => {
  try {
    const loanId = parseInt(String(req.body.loanId ?? ''), 10);
    if (!loanId) return res.status(400).json({ error: 'Loan ID is required.' });

    const [loan] = await db
      .select()
      .from(equipmentLoans)
      .where(and(eq(equipmentLoans.id, loanId), eq(equipmentLoans.returned, false)))
      .limit(1);

    if (!loan) {
      return res.status(404).json({ error: 'Active loan not found.' });
    }

    const now = new Date();
    await db
      .update(equipmentLoans)
      .set({ returned: true, returnedDate: now })
      .where(eq(equipmentLoans.id, loanId));

    await db
      .update(equipmentUnits)
      .set({ status: 'Available' })
      .where(eq(equipmentUnits.id, loan.unitId));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /loans/return error:', err);
    res.status(500).json({ error: 'Failed to return equipment.' });
  }
});

export default router;
