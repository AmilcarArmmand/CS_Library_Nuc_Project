// kiosk/src/routes/kiosk.ts
// All kiosk routes for the Raspberry Pi app.
// Every data operation is a fetch() to the cloud server — no DB access.
//
//   GET  /           → kiosk-login.ejs
//   POST /login      → authenticates against cloud API
//   GET  /dashboard  → kiosk-dashboard.ejs
//   GET  /logout     → clears session
//
// The dashboard page makes these calls directly from the browser JS:
//   GET  /api/catalog
//   GET  /api/books/:isbn
//   POST /api/cart/add
//   POST /api/checkout
//   POST /api/return            ← smart return: handles both books and equipment
//   GET  /api/my-loans
//   POST /api/renew
//   GET  /api/equipment/scan/:barcode
//   POST /api/equipment/checkout
//   POST /api/equipment/return
//   GET  /api/equipment/loans
// All of which are proxied below to the cloud server.

import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const router = express.Router();

// ── Cloud API client ───────────────────────────────────────────────────────────

function cloudUrl(path: string): string {
  const base = (process.env['CLOUD_API_URL'] ?? '').replace(/\/$/, '');
  return `${base}${path}`;
}

function cloudHeaders(): Record<string, string> {
  return {
    'Content-Type':  'application/json',
    'X-Kiosk-Key':   process.env['CLOUD_API_KEY'] ?? '',
  };
}

async function cloudFetch(
  method: string,
  path: string,
  body?: object,
): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(cloudUrl(path), {
      method,
      headers: cloudHeaders(),
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`[Kiosk] Cloud fetch failed: ${method} ${path}`, err);
    return { ok: false, status: 503, data: { error: 'Could not reach the server.' } };
  }
}

// ── Session helpers ────────────────────────────────────────────────────────────

interface KioskUser {
  id: number;
  name: string;
  email: string;
  studentId: string | null;
  active: boolean;
}

function getUser(req: Request): KioskUser | null {
  return (req.session as any)['kioskUser'] ?? null;
}

function setUser(req: Request, user: KioskUser | null): void {
  (req.session as any)['kioskUser'] = user;
}

function getCart(req: Request): any[] {
  return (req.session as any)['kioskCart'] ?? [];
}

function setCart(req: Request, cart: any[]): void {
  (req.session as any)['kioskCart'] = cart;
}

function requireLogin(req: Request, res: Response, next: NextFunction): void {
  if (getUser(req)) { next(); return; }
  res.redirect('/');
}

function getIdleTimeoutMs(): number {
  const minutes = Number(process.env['KIOSK_IDLE_TIMEOUT_MINUTES'] ?? 3);
  return Math.max(1, minutes) * 60 * 1000;
}

function getIdleWarningMs(): number {
  const seconds = Number(process.env['KIOSK_IDLE_WARNING_SECONDS'] ?? 30);
  return Math.max(10, seconds) * 1000;
}

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

// ── GET / — Login page ────────────────────────────────────────────────────────

router.get('/', (req: Request, res: Response) => {
  if (getUser(req)) { res.redirect('/dashboard'); return; }
  const timedOut = String(req.query['timedOut'] ?? '') === '1';
  res.render('pages/kiosk-login', {
    title: 'CS Library Kiosk',
    error: null,
    notice: timedOut ? 'Signed out after inactivity. Scan your ID to continue.' : null,
  });
});

// ── POST /login — Student ID lookup ──────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const studentId = extractStudentId(req.body.studentId);

  if (!/^[A-Z0-9]{5,16}$/.test(studentId)) {
    res.render('pages/kiosk-login', {
      title: 'CS Library Kiosk',
      error: 'Scan a valid student ID barcode to continue.',
      notice: null,
    });
    return;
  }

  const { ok, status, data } = await cloudFetch('POST', '/login', { studentId });

  if (!ok) {
    const error =
      status === 404 ? 'Student ID not found. Please register an account first.' :
      status === 403 ? 'This student ID is disabled. Please contact library staff.' :
      data.error ?? 'Could not reach the server. Please try again.';
    res.render('pages/kiosk-login', { title: 'CS Library Kiosk', error, notice: null });
    return;
  }

  setUser(req, data.user as KioskUser);
  setCart(req, []);

  const msg = encodeURIComponent(`Welcome, ${data.user.name}!`);
  res.redirect(`/dashboard?welcome=${msg}`);
});

// ── GET /dashboard ────────────────────────────────────────────────────────────

router.get('/dashboard', requireLogin, (req: Request, res: Response) => {
  const user    = getUser(req)!;
  const welcome = req.query['welcome'] ? String(req.query['welcome']) : null;
  res.render('pages/kiosk-dashboard', {
    title:   'CS Library Kiosk',
    user,
    cart:    getCart(req),
    welcome,
    idleTimeoutMs: getIdleTimeoutMs(),
    idleWarningMs: getIdleWarningMs(),
  });
});

// ── GET /logout ───────────────────────────────────────────────────────────────

router.get('/logout', (req: Request, res: Response) => {
  const reason = String(req.query['reason'] ?? '');
  req.session.destroy(() => {
    res.redirect(reason === 'idle' ? '/?timedOut=1' : '/');
  });
});

// ── API PROXY ROUTES ──────────────────────────────────────────────────────────
// The dashboard EJS page's JavaScript calls these local routes.
// Each one proxies the request to the cloud server and returns the result.
// This keeps the CLOUD_API_KEY out of the browser entirely.

// GET /api/catalog
router.get('/api/catalog', requireLogin, async (req: Request, res: Response) => {
  const user = getUser(req)!;
  const { ok, data } = await cloudFetch('GET', `/books?userId=${user.id}`);
  if (ok) data.books = data.books ?? [];
  if (!ok) { res.status(502).json(data); return; }
  res.json(data);
});

// GET /api/books/:isbn
router.get('/api/books/:isbn', requireLogin, async (req: Request, res: Response) => {
  const isbn = String(req.params['isbn'] ?? '');
  const { ok, status, data } = await cloudFetch('GET', `/books/${encodeURIComponent(isbn)}`);
  res.status(ok ? 200 : status).json(data);
});

// POST /api/cart/add
router.post('/api/cart/add', requireLogin, async (req: Request, res: Response) => {
  const rawIsbn = String(req.body.isbn ?? '');
  const isbn    = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();

  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
    res.status(400).json({ error: 'Scan or type a valid 10- or 13-digit ISBN.' });
    return;
  }

  // Validate the book exists and is available on the server
  const { ok, status, data } = await cloudFetch('GET', `/books/${isbn}`);
  if (!ok) { res.status(status).json(data); return; }

  const book = data.book;
  const cart = getCart(req);

  if (cart.some((b: any) => b.isbn === isbn)) {
    res.status(409).json({ error: 'This book is already in the cart.' });
    return;
  }
  if (book.status !== 'Available') {
    res.status(409).json({ error: 'Book is already checked out.' });
    return;
  }

  cart.push(book);
  setCart(req, cart);
  res.json({ book, cartCount: cart.length });
});

// POST /api/cart/clear
router.post('/api/cart/clear', requireLogin, (req: Request, res: Response) => {
  setCart(req, []);
  res.json({ ok: true });
});

// POST /api/cart/remove
router.post('/api/cart/remove', requireLogin, (req: Request, res: Response) => {
  const isbn = String(req.body.isbn ?? '');
  let cart = getCart(req);
  cart = cart.filter((b: any) => b.isbn !== isbn);
  setCart(req, cart);
  res.json({ ok: true, cartCount: cart.length });
});

// POST /api/session/ping
router.post('/api/session/ping', requireLogin, (req: Request, res: Response) => {
  req.session.touch();
  res.json({ ok: true });
});

// POST /api/checkout
router.post('/api/checkout', requireLogin, async (req: Request, res: Response) => {
  const user  = getUser(req)!;
  const cart  = getCart(req);
  const isbns = cart.map((b: any) => b.isbn);

  if (!isbns.length) {
    res.status(400).json({ error: 'Cart is empty.' });
    return;
  }

  const { ok, status, data } = await cloudFetch('POST', '/checkout', {
    userId: user.id,
    isbns,
  });

  if (!ok) { res.status(status).json(data); return; }

  setCart(req, []);
  res.json(data);
});

// POST /api/return
// Smart return: tries book (ISBN) first, then equipment barcode as a fallback.
// ISBNs are purely numeric (10 or 13 digits). Equipment barcodes contain
// letters or other characters (e.g. "MIC-001"), so the distinction is clear.
router.post('/api/return', requireLogin, async (req: Request, res: Response) => {
  const rawInput = String(req.body.isbn ?? req.body.barcode ?? '').trim();
  const user     = getUser(req)!;

  if (!rawInput) {
    res.status(400).json({ error: 'Scan a barcode to return.' });
    return;
  }

  // Try book return first — ISBNs are numeric only (10 or 13 digits)
  const cleanIsbn = rawInput.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
    const { ok, status, data } = await cloudFetch('POST', '/return', {
      userId: user.id,
      isbn:   cleanIsbn,
    });
    if (ok)             { res.json({ ...data, type: 'book' }); return; }
    if (status !== 404) { res.status(status).json(data);       return; }
    // 404 means no active book loan — fall through to try equipment
  }

  // Fall back to equipment return using the raw barcode
  const barcode = rawInput.toUpperCase();
  const { ok, status, data } = await cloudFetch('POST', '/equipment/return', {
    userId:  user.id,
    barcode,
  });
  res.status(ok ? 200 : status).json({ ...data, type: 'equipment' });
});

// GET /api/my-loans
router.get('/api/my-loans', requireLogin, async (req: Request, res: Response) => {
  const user = getUser(req)!;
  const { ok, status, data } = await cloudFetch('GET', `/loans/${user.id}`);
  res.status(ok ? 200 : status).json(data);
});

// POST /api/renew
router.post('/api/renew', requireLogin, async (req: Request, res: Response) => {
  const { ok, status, data } = await cloudFetch('POST', '/renew', {
    loanId: req.body.loanId,
  });
  res.status(ok ? 200 : status).json(data);
});

// POST /api/donate — Donate a book
router.post('/api/donate', requireLogin, async (req: Request, res: Response) => {
  const user = getUser(req)!;
  const { ok, status, data } = await cloudFetch('POST', '/donate', {
    isbn:      req.body.isbn,
    title:     req.body.title,
    author:    req.body.author,
    cover:     req.body.cover,
    donorName: user.name,
  });
  res.status(ok ? 200 : status).json(data);
});

// POST /api/donate/lookup — Lookup ISBN via Open Library
router.post('/api/donate/lookup', requireLogin, async (req: Request, res: Response) => {
  const isbn = String(req.body.isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (!isbn) { res.status(400).json({ error: 'ISBN required.' }); return; }

  try {
    const olRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const olData = await olRes.json().catch(() => ({}));
    const bookData = (olData as any)[`ISBN:${isbn}`];

    if (!bookData) {
      res.status(404).json({ error: 'Not found on Open Library. Enter details manually.' });
      return;
    }

    res.json({
      isbn,
      title:  bookData.title || '',
      author: bookData.authors?.[0]?.name || '',
      cover:  bookData.cover?.large || `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    });
  } catch {
    res.status(500).json({ error: 'Lookup failed.' });
  }
});

// POST /api/hold — Place a hold
router.post('/api/hold', requireLogin, async (req: Request, res: Response) => {
  const user = getUser(req)!;
  const { ok, status, data } = await cloudFetch('POST', '/hold', {
    userId: user.id,
    isbn:   req.body.isbn,
  });
  res.status(ok ? 200 : status).json(data);
});

// GET /api/my-holds
router.get('/api/my-holds', requireLogin, async (req: Request, res: Response) => {
  const user = getUser(req)!;
  const { ok, status, data } = await cloudFetch('GET', `/holds/${user.id}`);
  res.status(ok ? 200 : status).json(data);
});

// ── EQUIPMENT PROXY ROUTES ────────────────────────────────────────────────────

// GET /api/equipment/scan/:barcode
// Look up a unit by barcode — called when user scans in the Equipment tab.
router.get('/api/equipment/scan/:barcode', requireLogin, async (req: Request, res: Response) => {
  const barcode = String(req.params['barcode'] ?? '').trim().toUpperCase();
  const user    = getUser(req)!;
  const { ok, status, data } = await cloudFetch(
    'GET',
    `/equipment/scan/${encodeURIComponent(barcode)}?userId=${user.id}`,
  );
  res.status(ok ? 200 : status).json(data);
});

// POST /api/equipment/checkout
router.post('/api/equipment/checkout', requireLogin, async (req: Request, res: Response) => {
  const user    = getUser(req)!;
  const barcode = String(req.body.barcode ?? '').trim().toUpperCase();
  const { ok, status, data } = await cloudFetch('POST', '/equipment/checkout', {
    userId: user.id,
    barcode,
  });
  res.status(ok ? 200 : status).json(data);
});

// POST /api/equipment/return
router.post('/api/equipment/return', requireLogin, async (req: Request, res: Response) => {
  const user    = getUser(req)!;
  const barcode = String(req.body.barcode ?? '').trim().toUpperCase();
  const { ok, status, data } = await cloudFetch('POST', '/equipment/return', {
    userId: user.id,
    barcode,
  });
  res.status(ok ? 200 : status).json(data);
});

// GET /api/equipment/loans
router.get('/api/equipment/loans', requireLogin, async (req: Request, res: Response) => {
  const user = getUser(req)!;
  const { ok, status, data } = await cloudFetch('GET', `/equipment/loans/${user.id}`);
  res.status(ok ? 200 : status).json(data);
});

// GET /api/equipment/catalog
router.get('/api/equipment/catalog', requireLogin, async (req: Request, res: Response) => {
  const { ok, status, data } = await cloudFetch('GET', '/equipment/catalog');
  res.status(ok ? 200 : status).json(data);
});

export default router;