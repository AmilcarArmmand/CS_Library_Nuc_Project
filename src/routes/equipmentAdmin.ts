// src/routes/equipmentAdmin.ts
// Admin equipment management — mounted at /admin/equipment in app.ts.
//
// KEY CHANGE: multiple units can now share the same barcode (same equipment type only).
// The GET / route groups units by barcode for display.
// POST /units/add accepts a quantity field to bulk-insert N units.
// POST /units/remove-one removes one available unit from a barcode group.
// POST /units/remove-barcode removes all units for a barcode (blocked if any on loan).
// POST /units/edit updates condition + notes for ALL units sharing a barcode.

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

const router = express.Router();
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
      const itemUnits = allUnits
        .filter(u => u.equipmentId === item.id)
        .map(u => ({ ...u, activeLoan: loanByUnitId.get(u.id) ?? null }));

      // Group units by barcode
      const barcodeMap = new Map<string, typeof itemUnits>();
      for (const unit of itemUnits) {
        if (!barcodeMap.has(unit.barcode)) barcodeMap.set(unit.barcode, []);
        barcodeMap.get(unit.barcode)!.push(unit);
      }

      const barcodeGroups = Array.from(barcodeMap.entries()).map(([barcode, units]) => ({
        barcode,
        units,
        totalCount:     units.length,
        availableCount: units.filter(u => u.status === 'Available').length,
        onLoanCount:    units.filter(u => u.activeLoan !== null).length,
        condition:      units[0]?.condition ?? 'Good',
        notes:          units[0]?.notes ?? '',
        activeLoans:    units.map(u => u.activeLoan).filter(Boolean),
      }));

      return {
        ...item,
        barcodeGroups,
        totalUnits:     itemUnits.length,
        availableUnits: itemUnits.filter(u => u.status === 'Available').length,
        activeLoans:    itemUnits.filter(u => u.activeLoan !== null).length,
      };
    });

    res.render('pages/admin/equipment', {
      title: 'Equipment Management — CS Library Admin',
      admin: _req.user,
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

router.post('/add', async (req: Request, res: Response) => {
  try {
    const name             = String(req.body.name            ?? '').trim();
    const description      = String(req.body.description     ?? '').trim();
    const category         = String(req.body.category        ?? '').trim();
    const image            = String(req.body.image           ?? '').trim();
    const loanDurationDays = Math.max(1, parseInt(String(req.body.loanDurationDays ?? '7'), 10) || 7);

    if (!name) return res.status(400).json({ error: 'Name is required.' });

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

router.post('/edit', async (req: Request, res: Response) => {
  try {
    const id               = parseInt(String(req.body.id ?? ''), 10);
    const name             = String(req.body.name            ?? '').trim();
    const description      = String(req.body.description     ?? '').trim();
    const category         = String(req.body.category        ?? '').trim();
    const image            = String(req.body.image           ?? '').trim();
    const loanDurationDays = Math.max(1, parseInt(String(req.body.loanDurationDays ?? '7'), 10) || 7);

    if (!id || !name) return res.status(400).json({ error: 'ID and name are required.' });

    await db.update(equipment)
      .set({ name, description, category, image, loanDurationDays, updatedAt: new Date() })
      .where(eq(equipment.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /edit error:', err);
    res.status(500).json({ error: 'Failed to update equipment.' });
  }
});

router.post('/delete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.body.id ?? ''), 10);
    if (!id) return res.status(400).json({ error: 'ID is required.' });

    const [activeLoan] = await db
      .select({ id: equipmentLoans.id })
      .from(equipmentLoans)
      .innerJoin(equipmentUnits, eq(equipmentLoans.unitId, equipmentUnits.id))
      .where(and(eq(equipmentUnits.equipmentId, id), eq(equipmentLoans.returned, false)))
      .limit(1);

    if (activeLoan) {
      return res.status(409).json({ error: 'Cannot delete — this equipment type has active loans.' });
    }

    await db.delete(equipment).where(eq(equipment.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /delete error:', err);
    res.status(500).json({ error: 'Failed to delete equipment.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT CRUD — barcode-group-aware
// ─────────────────────────────────────────────────────────────────────────────

// POST /admin/equipment/units/add
// Accepts quantity (1–50). Inserts N units all with the same barcode.
// A barcode may be reused within the same equipment type, but NOT across different types.

router.post('/units/add', async (req: Request, res: Response) => {
  try {
    const equipmentId = parseInt(String(req.body.equipmentId ?? ''), 10);
    const barcode     = String(req.body.barcode   ?? '').trim().toUpperCase();
    const condition   = String(req.body.condition ?? 'Good').trim();
    const notes       = String(req.body.notes     ?? '').trim();
    const quantity    = Math.max(1, Math.min(50, parseInt(String(req.body.quantity ?? '1'), 10) || 1));

    if (!equipmentId || !barcode) {
      return res.status(400).json({ error: 'Equipment ID and barcode are required.' });
    }

    const validConditions = ['Good', 'Fair', 'Poor'];
    if (!validConditions.includes(condition)) {
      return res.status(400).json({ error: 'Invalid condition value.' });
    }

    // Barcode may be reused for the same equipment type, but not across different types
    const [conflict] = await db
      .select({ equipmentId: equipmentUnits.equipmentId })
      .from(equipmentUnits)
      .where(eq(equipmentUnits.barcode, barcode))
      .limit(1);

    if (conflict && conflict.equipmentId !== equipmentId) {
      return res.status(409).json({
        error: `Barcode "${barcode}" is already used by a different equipment type.`,
      });
    }

    const values = Array.from({ length: quantity }, () => ({
      equipmentId,
      barcode,
      condition,
      notes,
      status: 'Available' as const,
    }));

    const inserted = await db.insert(equipmentUnits).values(values).returning();
    res.json({ ok: true, units: inserted, count: inserted.length });
  } catch (err) {
    console.error('[Admin Equipment] /units/add error:', err);
    res.status(500).json({ error: 'Failed to add units.' });
  }
});

// POST /admin/equipment/units/edit
// Updates condition and notes for ALL units sharing a barcode.

router.post('/units/edit', async (req: Request, res: Response) => {
  try {
    const equipmentId = parseInt(String(req.body.equipmentId ?? ''), 10);
    const barcode     = String(req.body.barcode   ?? '').trim().toUpperCase();
    const condition   = String(req.body.condition ?? '').trim();
    const notes       = String(req.body.notes     ?? '').trim();

    if (!equipmentId || !barcode) {
      return res.status(400).json({ error: 'Equipment ID and barcode are required.' });
    }

    const validConditions = ['Good', 'Fair', 'Poor'];
    if (condition && !validConditions.includes(condition)) {
      return res.status(400).json({ error: 'Invalid condition.' });
    }

    await db
      .update(equipmentUnits)
      .set({ ...(condition ? { condition } : {}), notes })
      .where(and(eq(equipmentUnits.equipmentId, equipmentId), eq(equipmentUnits.barcode, barcode)));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /units/edit error:', err);
    res.status(500).json({ error: 'Failed to update units.' });
  }
});

// POST /admin/equipment/units/remove-one
// Removes one available unit from a barcode group (decrements count by 1).

router.post('/units/remove-one', async (req: Request, res: Response) => {
  try {
    const equipmentId = parseInt(String(req.body.equipmentId ?? ''), 10);
    const barcode     = String(req.body.barcode ?? '').trim().toUpperCase();

    if (!equipmentId || !barcode) {
      return res.status(400).json({ error: 'Equipment ID and barcode are required.' });
    }

    const [unit] = await db
      .select({ id: equipmentUnits.id })
      .from(equipmentUnits)
      .where(and(
        eq(equipmentUnits.equipmentId, equipmentId),
        eq(equipmentUnits.barcode, barcode),
        eq(equipmentUnits.status, 'Available'),
      ))
      .limit(1);

    if (!unit) {
      return res.status(409).json({ error: 'No available units to remove for this barcode.' });
    }

    await db.delete(equipmentUnits).where(eq(equipmentUnits.id, unit.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /units/remove-one error:', err);
    res.status(500).json({ error: 'Failed to remove unit.' });
  }
});

// POST /admin/equipment/units/remove-barcode
// Removes ALL units with a barcode. Blocked if any unit in the group is on active loan.

router.post('/units/remove-barcode', async (req: Request, res: Response) => {
  try {
    const equipmentId = parseInt(String(req.body.equipmentId ?? ''), 10);
    const barcode     = String(req.body.barcode ?? '').trim().toUpperCase();

    if (!equipmentId || !barcode) {
      return res.status(400).json({ error: 'Equipment ID and barcode are required.' });
    }

    const [activeLoan] = await db
      .select({ id: equipmentLoans.id })
      .from(equipmentLoans)
      .innerJoin(equipmentUnits, eq(equipmentLoans.unitId, equipmentUnits.id))
      .where(and(
        eq(equipmentUnits.equipmentId, equipmentId),
        eq(equipmentUnits.barcode, barcode),
        eq(equipmentLoans.returned, false),
      ))
      .limit(1);

    if (activeLoan) {
      return res.status(409).json({
        error: 'Cannot remove — one or more units with this barcode are currently on loan.',
      });
    }

    const units = await db
      .select({ id: equipmentUnits.id })
      .from(equipmentUnits)
      .where(and(eq(equipmentUnits.equipmentId, equipmentId), eq(equipmentUnits.barcode, barcode)));

    for (const unit of units) {
      await db.delete(equipmentUnits).where(eq(equipmentUnits.id, unit.id));
    }

    res.json({ ok: true, removed: units.length });
  } catch (err) {
    console.error('[Admin Equipment] /units/remove-barcode error:', err);
    res.status(500).json({ error: 'Failed to remove barcode group.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOAN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.post('/loans/return', async (req: Request, res: Response) => {
  try {
    const loanId = parseInt(String(req.body.loanId ?? ''), 10);
    if (!loanId) return res.status(400).json({ error: 'Loan ID is required.' });

    const [loan] = await db
      .select()
      .from(equipmentLoans)
      .where(and(eq(equipmentLoans.id, loanId), eq(equipmentLoans.returned, false)))
      .limit(1);

    if (!loan) return res.status(404).json({ error: 'Active loan not found.' });

    await db.update(equipmentLoans)
      .set({ returned: true, returnedDate: new Date() })
      .where(eq(equipmentLoans.id, loanId));

    await db.update(equipmentUnits)
      .set({ status: 'Available' })
      .where(eq(equipmentUnits.id, loan.unitId));

    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Equipment] /loans/return error:', err);
    res.status(500).json({ error: 'Failed to return equipment.' });
  }
});

export default router;