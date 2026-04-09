import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import type { ErrorRequestHandler } from 'express';

import { connectDatabase } from './db/database.js';
import passport, { authProviders } from './config/passport.js';
import sessionConfig from './config/session.js';

import authRoutes         from './routes/auth.js';
import webDashboardRoutes from './routes/webDashboard.js';
import kioskApiRoutes     from './routes/kioskApi.js';
import { attachUser }     from './middleware/auth.js';
import adminRoutes from './routes/admin.js';

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

// HOME
app.get('/', (req, res) => {
  res.render('pages/index', {
    title:       'CS Library',
    message:     req.query['message'] === 'logged_out' ? 'You have been signed out.' : null,
    user:        req.user ?? null,
    projectName: 'CS Library Project',
  });
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
  console.log(`   Google OAuth: ${config.oauth.googleClientId ? 'Configured ✓' : 'Not set'}`);
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
