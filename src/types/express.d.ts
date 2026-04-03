import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import type { ErrorRequestHandler } from 'express';

// Database connection
import { connectDatabase } from './db/database.js';

// Authentication
import passport from './config/passport.js';
import sessionConfig from './config/session.js';

// Routes
import authRoutes      from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import kioskApiRoutes  from './routes/kioskApi.js';

// Middleware
import { attachUser } from './middleware/auth.js';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app     = express();
const PORT    = config.port || 3000;
const NODE_ENV = config.nodeEnv;

// Connect to PostgreSQL
await connectDatabase();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session (must come before passport)
app.use(sessionConfig);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Attach user to all templates
app.use(attachUser);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/auth',       authRoutes);
app.use('/dashboard',  dashboardRoutes);
app.use('/api/kiosk',  kioskApiRoutes);   // REST API for the Pi kiosk

// Home
app.get('/', (req, res) => {
    const message = req.query['message'] === 'logged_out'
        ? 'You have been successfully logged out.'
        : 'Development environment setup complete!';

    res.render('pages/index', {
        title:       'CS Library Project',
        message,
        user:        req.user ?? null,
        projectName: 'CS Library Project',
    });
});

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status:      'OK',
        timestamp:   new Date().toISOString(),
        database:    'Connected',
        environment: NODE_ENV,
    });
});

// ── Error handling ─────────────────────────────────────────────────────────────

// 404
app.use((_req, res) => {
    res.status(404).render('pages/error', {
        title:       'Page Not Found',
        error:       'The page you are looking for does not exist.',
        projectName: 'CS Library Project',
    });
});

// 500
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    console.error('❌ Error:', err);
    console.error('Stack:',  err.stack);
    console.error('Path:',   req.path);
    console.error('Method:', req.method);

    const isProduction = config.nodeEnv === 'production';

    res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
    });
};

app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ CS Library running on http://localhost:${PORT}`);
    console.log(`   Environment : ${NODE_ENV}`);
    console.log(`   Google OAuth: ${config.oauth.googleClientId ? 'Configured ✓' : 'Not configured'}`);
    console.log(`   PostgreSQL  : ${config.postgresdb.password  ? 'Connected ✓'  : 'Not configured'}`);
});

export default app;