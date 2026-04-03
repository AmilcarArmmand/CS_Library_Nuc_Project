import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import type { ErrorRequestHandler } from 'express';

import { connectDatabase } from './db/database.js';
import passport from './config/passport.js';
import sessionConfig from './config/session.js';

import authRoutes         from './routes/auth.js';
import webDashboardRoutes from './routes/webDashboard.js';
import kioskApiRoutes     from './routes/kioskApi.js';
import { attachUser }     from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app      = express();
const PORT     = config.port || 3000;
const HOST     = '0.0.0.0';   // Accept connections on all network interfaces
const NODE_ENV = config.nodeEnv;
const IS_PROD  = NODE_ENV === 'production';

// ── Trust GCP's load balancer / proxy ─────────────────────────────────────────
// GCP puts a load balancer in front of your VM that terminates HTTPS.
// Without this, req.secure and req.ip will be wrong, and session cookies
// with secure:true won't work.
if (IS_PROD) {
  app.set('trust proxy', 1);
}

await connectDatabase();

// ── View engine ────────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));

// ── Static files ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(process.cwd(), 'src', 'public')));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Session + Passport ─────────────────────────────────────────────────────────
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());
app.use(attachUser);

// ── Routes ─────────────────────────────────────────────────────────────────────

app.use('/auth',          authRoutes);
app.use('/web-dashboard', webDashboardRoutes);
app.use('/api/kiosk',     kioskApiRoutes);   // Pi only — protected by API key

// Future: admin panel
// app.use('/dashboard', dashboardRoutes);

// ── Home ────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('pages/index', {
    title:       'CS Library',
    message:     req.query['message'] === 'logged_out' ? 'You have been signed out.' : null,
    user:        req.user ?? null,
    projectName: 'CS Library Project',
  });
});

// ── Health check — used by GCP to verify the instance is alive ────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status:      'OK',
    timestamp:   new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ── 404 ─────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).render('pages/error', {
    title:       'Page Not Found',
    error:       'The page you are looking for does not exist.',
    projectName: 'CS Library Project',
  });
});

// ── 500 ─────────────────────────────────────────────────────────────────────────
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error('❌ Error:', err.message, '— Path:', req.path);
  res.status(err.status || 500).json({
    // Never leak stack traces in production
    error: IS_PROD ? 'Internal Server Error' : err.message,
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
};
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`\n✅ CS Library running on http://${HOST}:${PORT}`);
  console.log(`   Environment : ${NODE_ENV}`);
  console.log(`   Google OAuth: ${config.oauth.googleClientId ? 'Configured ✓' : 'Not set'}`);
  console.log(`   PostgreSQL  : ${config.postgresdb.password  ? 'Configured ✓' : 'Not configured'}`);
  if (!IS_PROD) {
    console.log(`\n   Home        : http://localhost:${PORT}/`);
    console.log(`   Web login   : http://localhost:${PORT}/auth/login`);
    console.log(`   Web portal  : http://localhost:${PORT}/web-dashboard`);
    console.log(`   Kiosk API   : http://localhost:${PORT}/api/kiosk\n`);
  }
});

export default app;