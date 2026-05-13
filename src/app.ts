import { db } from './db/database.js';
import { books, users, loans, equipment, equipmentUnits, equipmentLoans, reviews } from './db/schema/schema.js';
import { desc, count, and, eq, gt, isNull, inArray } from 'drizzle-orm';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import type { ErrorRequestHandler } from 'express';

import { connectDatabase } from './db/database.js';
import passport, { authProviders } from './config/passport.js';
import sessionConfig from './config/session.js';

import { sendEmail } from './utils/emailService.js';

import authRoutes         from './routes/auth.js';
import webDashboardRoutes from './routes/webDashboard.js';
import kioskApiRoutes     from './routes/kioskApi.js';
import { attachUser }     from './middleware/auth.js';
import adminRoutes from './routes/admin.js';
import equipmentAdminRoutes from './routes/equipmentAdmin.js';
import reviewAdminRoutes from './routes/reviewAdmin.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app      = express();
const PORT     = Number(config.port) || 8080;
const HOST     = '0.0.0.0';   // Accept connections on all network interfaces
const NODE_ENV = config.nodeEnv;
const IS_PROD  = NODE_ENV === 'production';

// Allow proxy trust to be controlled from the environment so the app can run
// directly on HTTP during initial bring-up and later behind Nginx/TLS.
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

await connectDatabase();

// VIEW ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));

// STATIC FILES
app.use(express.static(path.join(process.cwd(), 'src', 'public')));
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use('/favicon1.ico', express.static(path.join(process.cwd(), 'favicon1.ico')));

// BODY PARSING
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// SESSION + PASSPORT
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());
app.use(attachUser);
app.use((_req, res, next) => {
  res.locals.authProviders = authProviders;
  next();
});

// ROUTES
app.use('/auth',          authRoutes);
app.use('/web-dashboard', webDashboardRoutes);
app.use('/api/kiosk',     kioskApiRoutes);   // Pi only — protected by API key
app.use('/admin', adminRoutes);
app.use('/admin/equipment', equipmentAdminRoutes);
app.use('/admin/reviews', reviewAdminRoutes);
app.use('/settings', settingsRoutes);

// HOME

// The homepage.
// This is made so it shows some stats and the 5 newest books. 
// It also has a login/logout button in the header.
app.get('/', async (req, res) => {
  try {
    const allBooks = await db.select().from(books);
    const newest   = allBooks
      .slice()
      .sort((a, b) => b.isbn.localeCompare(a.isbn))
      .slice(0, 5);

    const total     = allBooks.length;
    const available = allBooks.filter(b => b.status === 'Available').length;

    // Equipment stats
    const allEquipment = await db.select().from(equipment).orderBy(equipment.createdAt);
    const allUnits     = await db.select({ status: equipmentUnits.status }).from(equipmentUnits);
    const newestEquipment = allEquipment.slice().reverse().slice(0, 5);

    const totalUnits     = allUnits.length;
    const availableUnits = allUnits.filter(u => u.status === 'Available').length;

    // Attach availability counts to each equipment item
    const unitsByEquipId = new Map<number, { total: number; available: number }>();
    for (const u of allUnits) {
      // we need equipmentId — re-query with it
    }
    const unitsWithId = await db
      .select({ equipmentId: equipmentUnits.equipmentId, status: equipmentUnits.status })
      .from(equipmentUnits);
    for (const u of unitsWithId) {
      const cur = unitsByEquipId.get(u.equipmentId) ?? { total: 0, available: 0 };
      cur.total++;
      if (u.status === 'Available') cur.available++;
      unitsByEquipId.set(u.equipmentId, cur);
    }
    const newestEquipmentEnriched = newestEquipment.map(e => ({
      ...e,
      totalUnits:     unitsByEquipId.get(e.id)?.total     ?? 0,
      availableUnits: unitsByEquipId.get(e.id)?.available ?? 0,
    }));

    res.render('pages/index', {
      title:          'CS Library',
      message:        req.query['message'] === 'logged_out' ? 'You have been signed out.' : null,
      user:           req.user ?? null,
      projectName:    'CS Library Project',
      newestBooks:    newest,
      totalBooks:     total,
      availableBooks: available,
      checkedOutBooks: total - available,
      newestEquipment: newestEquipmentEnriched,
      totalEquipmentTypes: allEquipment.length,
      totalEquipmentUnits: totalUnits,
      availableEquipmentUnits: availableUnits,
    });
  } catch {
    res.render('pages/index', {
      title: 'CS Library', message: null, user: req.user ?? null,
      projectName: 'CS Library Project',
      newestBooks: [], totalBooks: 0, availableBooks: 0, checkedOutBooks: 0,
    });
  }
});

// ── ABOUT PAGE ────────────────────────────────────────────────────────────────
app.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About — CS Library',
    user:  req.user ?? null,
    flash: req.session['aboutFlash'] ? (() => {
      const f = req.session['aboutFlash'];
      delete req.session['aboutFlash'];
      return f;
    })() : null,
    formData: {},
  });
});

app.post('/about/contact', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    res.redirect('/auth/login');
    return;
  }

  const user    = req.user as any;
  const subject = String(req.body.subject ?? '').trim();
  const message = String(req.body.message ?? '').trim();

  if (!subject || !message) {
    req.session['aboutFlash'] = { error: 'Subject and message are required.' };
    res.redirect('/about');
    return;
  }

  const adminUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.role, 'admin'));

  if (!adminUsers.length) {
    req.session['aboutFlash'] = { error: 'No admins available to receive your message. Please try again later.' };
    res.redirect('/about');
    return;
  }

  const adminEmail = adminUsers.map(u => u.email);

  try {
    const result = await (sendEmail as any)({
      to:      adminEmail,
      subject: `[CS Library Contact] ${subject}`,
      text: [
        `From: ${user.name} <${user.email}>`,
        `Subject: ${subject}`,
        '',
        message,
        '',
        `--- Sent via CS Library contact form ---`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
          <h2 style="margin-bottom:12px;">CS Library — Contact Form Message</h2>
          <p><strong>From:</strong> ${user.name} &lt;${user.email}&gt;</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0;" />
          <p style="white-space:pre-wrap;">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
        </div>
      `,
    });

    if (result.success) {
      req.session['aboutFlash'] = { success: 'Your message was sent! We\'ll get back to you soon.' };
    } else {
      req.session['aboutFlash'] = { error: 'Message could not be delivered. Please try again later.' };
    }
  } catch {
    req.session['aboutFlash'] = { error: 'Something went wrong. Please try again later.' };
  }

  res.redirect('/about');
});

// POPULAR BOOKS PAGE
app.get('/popular', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Trending: most checkouts in the last 30 days
    const trendingRaw = await db
      .select({
        isbn:            books.isbn,
        title:           books.title,
        author:          books.author,
        cover:           books.cover,
        status:          books.status,
        recentCheckouts: count(loans.id),
      })
      .from(books)
      .innerJoin(loans, and(
        eq(books.isbn, loans.isbn),
        gt(loans.checkedOut, thirtyDaysAgo),
      ))
      .groupBy(books.isbn, books.title, books.author, books.cover, books.status)
      .orderBy(desc(count(loans.id)))
      .limit(10);

    // All-time most borrowed
    const allTimeRaw = await db
      .select({
        isbn:           books.isbn,
        title:          books.title,
        author:         books.author,
        cover:          books.cover,
        status:         books.status,
        totalCheckouts: count(loans.id),
      })
      .from(books)
      .innerJoin(loans, eq(books.isbn, loans.isbn))
      .groupBy(books.isbn, books.title, books.author, books.cover, books.status)
      .orderBy(desc(count(loans.id)))
      .limit(10);

    // Recently returned (last 7 days, currently available)
    const returnedRaw = await db
      .select({
        isbn:         books.isbn,
        title:        books.title,
        author:       books.author,
        cover:        books.cover,
        returnedDate: loans.returnedDate,
      })
      .from(loans)
      .innerJoin(books, eq(loans.isbn, books.isbn))
      .where(and(
        eq(loans.returned, true),
        gt(loans.returnedDate, sevenDaysAgo),
        eq(books.status, 'Available'),
      ))
      .orderBy(desc(loans.returnedDate))
      .limit(12);

    // Deduplicate recently returned by ISBN (keep most recent)
    const seenIsbns = new Set<string>();
    const recentlyReturned = returnedRaw
      .filter(b => { if (seenIsbns.has(b.isbn)) return false; seenIsbns.add(b.isbn); return true; })
      .map(b => ({
        ...b,
        returnedAgo: (() => {
          const diffMs = Date.now() - new Date(b.returnedDate!).getTime();
          const diffH  = Math.floor(diffMs / 3600000);
          const diffD  = Math.floor(diffMs / 86400000);
          if (diffH < 1)  return 'just now';
          if (diffH < 24) return `${diffH}h ago`;
          return `${diffD} day${diffD !== 1 ? 's' : ''} ago`;
        })(),
      }));

      // Trending equipment: most checkouts in the last 30 days
      const trendingEquipRaw = await db
        .select({
          id:              equipment.id,
          name:            equipment.name,
          category:        equipment.category,
          image:           equipment.image,
          loanDurationDays: equipment.loanDurationDays,
          recentCheckouts: count(equipmentLoans.id),
        })
        .from(equipment)
        .innerJoin(equipmentUnits, eq(equipment.id, equipmentUnits.equipmentId))
        .innerJoin(equipmentLoans, and(
          eq(equipmentUnits.id, equipmentLoans.unitId),
          gt(equipmentLoans.checkedOut, thirtyDaysAgo),
        ))
        .groupBy(equipment.id, equipment.name, equipment.category, equipment.image, equipment.loanDurationDays)
        .orderBy(desc(count(equipmentLoans.id)))
        .limit(10);

      // All-time most borrowed equipment
      const allTimeEquipRaw = await db
        .select({
          id:              equipment.id,
          name:            equipment.name,
          category:        equipment.category,
          image:           equipment.image,
          loanDurationDays: equipment.loanDurationDays,
          totalCheckouts:  count(equipmentLoans.id),
        })
        .from(equipment)
        .innerJoin(equipmentUnits, eq(equipment.id, equipmentUnits.equipmentId))
        .innerJoin(equipmentLoans, eq(equipmentUnits.id, equipmentLoans.unitId))
        .groupBy(equipment.id, equipment.name, equipment.category, equipment.image, equipment.loanDurationDays)
        .orderBy(desc(count(equipmentLoans.id)))
        .limit(10);

      // Available unit counts per equipment type (for status display)
      const availableUnits = await db
        .select({ equipmentId: equipmentUnits.equipmentId, cnt: count() })
        .from(equipmentUnits)
        .where(eq(equipmentUnits.status, 'Available'))
        .groupBy(equipmentUnits.equipmentId);

      const availMap = new Map(availableUnits.map(u => [u.equipmentId, Number(u.cnt)]));

      // Recent reviews (last 10 across books and equipment, visible only)
    const recentReviewsRaw = await db
      .select({
        id:         reviews.id,
        targetType: reviews.targetType,
        targetId:   reviews.targetId,
        rating:     reviews.rating,
        body:       reviews.body,
        createdAt:  reviews.createdAt,
        userName:   users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(isNull(reviews.deletedAt))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    // Enrich with item names
    const rvBookIsbns = recentReviewsRaw.filter(r => r.targetType === 'book').map(r => r.targetId);
    const rvEquipIds  = recentReviewsRaw.filter(r => r.targetType === 'equipment').map(r => Number(r.targetId));
    const rvBookMap   = new Map<string, string>();
    const rvEquipMap  = new Map<number, string>();

    if (rvBookIsbns.length) {
      const rows = await db.select({ isbn: books.isbn, title: books.title }).from(books).where(inArray(books.isbn, rvBookIsbns));
      rows.forEach(b => rvBookMap.set(b.isbn, b.title));
    }
    if (rvEquipIds.length) {
      const rows = await db.select({ id: equipment.id, name: equipment.name }).from(equipment).where(inArray(equipment.id, rvEquipIds));
      rows.forEach(e => rvEquipMap.set(e.id, e.name));
    }

    const recentReviews = recentReviewsRaw.map(r => ({
      ...r,
      itemName: r.targetType === 'book'
        ? (rvBookMap.get(r.targetId) ?? 'Unknown Book')
        : (rvEquipMap.get(Number(r.targetId)) ?? 'Unknown Item'),
    }));

      const trendingEquip  = trendingEquipRaw.map(e  => ({ ...e,  availableUnits: availMap.get(e.id)  ?? 0 }));
      const allTimeEquip   = allTimeEquipRaw.map(e   => ({ ...e,  availableUnits: availMap.get(e.id)  ?? 0 }));
    res.render('pages/popular', {
      title: 'Popular Books & Equipment — CS Library',
      user:  req.user ?? null,
      trending:  trendingRaw,
      allTime:   allTimeRaw,
      recentlyReturned,
      trendingEquip,
      allTimeEquip,
      recentReviews,
    });
  } catch (err) {
    console.error('[Popular] route error:', err);
    res.status(500).render('pages/error', {
      title: 'Error', error: 'Could not load popular books.',
    });
  }
});

// CHECK HEALTH
app.get('/health', (_req, res) => {
  res.status(200).json({
    status:      'OK',
    timestamp:   new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// 404 ERROR
app.use((_req, res) => {
  res.status(404).render('pages/error', {
    title:       'Page Not Found',
    error:       'The page you are looking for does not exist.',
    projectName: 'CS Library Project',
  });
});

// 500 ERROR
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error('❌ Error:', err.message, '— Path:', req.path);
  res.status(err.status || 500).json({
    // Never leak stack traces in production
    error: IS_PROD ? 'Internal Server Error' : err.message,
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
};
app.use(errorHandler);

// APP START
app.listen(PORT, HOST, () => {
  console.log(`\n✅ CS Library running on: http://${HOST}:${PORT}`);
  console.log(`   Environment : ${NODE_ENV}`);
  console.log(`   Google OAuth: ${authProviders.google ? 'Configured ✓' : 'Not set'}`);
  if (authProviders.google) {
    console.log(`   Google callback: ${config.oauth.googleCallbackURL}`);
  }
  console.log(`   Outlook OAuth: ${authProviders.microsoft ? 'Configured ✓' : 'Not set'}`);
  if (authProviders.microsoft) {
    console.log(`   Outlook callback: ${config.oauth.microsoftCallbackURL}`);
    console.log(`   Outlook tenant : ${config.oauth.microsoftTenantId}`);
  }
  console.log(`   PostgreSQL  : ${config.postgresdb.password  ? 'Configured ✓' : 'Not configured'}`);
  console.log(`   Secure cookie: ${config.session.cookieSecure ? 'Enabled' : 'Disabled'}`);
  if (!IS_PROD) {
    console.log(`\n   Home        : http://${HOST}:${PORT}/`);
    console.log(`   Web login   : http://${HOST}:${PORT}/auth/login`);
    console.log(`   Web portal  : http://${HOST}:${PORT}/web-dashboard`);
    console.log(`   Kiosk API   : http://${HOST}:${PORT}/api/kiosk\n`);
  }
});

export default app;
