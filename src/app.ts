import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import type { ErrorRequestHandler } from 'express';

import { connectDatabase } from './db/database.js';
import passport from './config/passport.js';
import sessionConfig from './config/session.js';

import authRoutes      from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import webDashboardRoutes from './routes/webDashboard.js';
import kioskApiRoutes  from './routes/kioskApi.js';
import kioskRoutes     from './routes/kiosk.js';
import { attachUser }  from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app      = express();
const PORT     = config.port || 3000;
const NODE_ENV = config.nodeEnv;

await connectDatabase();

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));
app.use(express.static(path.join(process.cwd(), 'src', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());
app.use(attachUser);

// ── Routes ─────────────────────────────────────────────────────────────────────

// Web auth (login, register, Google OAuth, logout)
app.use('/auth', authRoutes);

// Web dashboard — browse catalog + my loans (for logged-in web users)
app.use('/web-dashboard', webDashboardRoutes);

// Old dashboard routes kept for the future admin panel
// app.use('/dashboard', dashboardRoutes);

// Kiosk REST API — called by external Pi kiosk apps (protected by API key)
app.use('/api/kiosk', kioskApiRoutes);

// Kiosk UI — full kiosk experience at /kiosk (login + dashboard)
app.use('/kiosk', kioskRoutes);

// ── Home ────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('pages/index', {
    title:       'CS Library',
    message:     req.query['message'] === 'logged_out' ? 'You have been signed out.' : null,
    user:        req.user ?? null,
    projectName: 'CS Library Project',
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), environment: NODE_ENV });
});

// ── 404 ─────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).render('pages/error', {
    title: 'Page Not Found', error: 'The page you are looking for does not exist.',
    projectName: 'CS Library Project',
  });
});

// ── 500 ─────────────────────────────────────────────────────────────────────────
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error('❌ Error:', err.message, '— Path:', req.path);
  const isProd = config.nodeEnv === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'Internal Server Error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
};
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ CS Library running on http://localhost:${PORT}`);
  console.log(`   Environment : ${NODE_ENV}`);
  console.log(`   Google OAuth: ${config.oauth.googleClientId ? 'Configured ✓' : 'Not set'}`);
  console.log(`   PostgreSQL  : ${config.postgresdb.password  ? 'Configured ✓' : 'Not configured'}`);
  console.log(`\n   Home        : http://localhost:${PORT}/`);
  console.log(`   Web login   : http://localhost:${PORT}/auth/login`);
  console.log(`   Kiosk login : http://localhost:${PORT}/kiosk`);
  console.log(`   Kiosk API   : http://localhost:${PORT}/api/kiosk\n`);
});

export default app;