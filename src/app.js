import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';

// Import database connection
import { connectDatabasePgsql } from './config/postgres.js';

// Import authentication
import passport from './config/passport.js';
import sessionConfig from './config/session.js';

// Import routes
import authRoutes from './routes/auth.js';
//import homeRoutes from './routes/home.js';
//import contactRoutes from './routes/contact.js';
import dashboardRoutes from './routes/dashboard.js';


// Import middleware
import { attachUser } from './middleware/auth.js';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port || 3000;
const NODE_ENV = config.nodeEnv;

// Connect to PostgreSQL
await connectDatabasePgsql();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session config (must come before passport)
app.use(sessionConfig);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Attach user to all templates
app.use(attachUser);

// Use route modules
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// Home route
app.get('/', (req, res) => {
    const message = req.query.message === 'logged_out'
        ? 'You have been successfully logged out.'
        : 'Development environment setup complete!';

    res.render('pages/index', {
        title: 'CS Library Project',
        message: message,
        user: req.user || null,
        projectName: 'CS Library Project'
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'Connected',
        environment: NODE_ENV
    });
});

// Development-only database test route
if (process.env.NODE_ENV === 'development') {
    app.get('/dev/db-test', async (req, res) => {
        try {
            const { testDatabaseOperations } = await import('./utils/dbTest.js');
            await testDatabaseOperations();
            res.json({ message: 'Database test completed - check console' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error', {
        title: 'Error',
        error: NODE_ENV === 'development' ? err.message : 'Something went wrong!',
        projectName: 'CS Library Project'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('pages/error', {
        title: 'Page Not Found',
        error: 'The page you are looking for does not exist.',
        projectName: 'CS Library Project'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`CS Library running on http://localhost:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Google OAuth: ${config.oauth.googleClientId ? 'Configured' : 'Not configured'}`);
    // console.log(`MongoDB: ${config.mongodb.url ? 'Connected' : 'Not configured'}`);
    console.log(`PostgreSQL: ${config.postgresdb.password ? 'Connected' : 'Not configured'}`);
});

export default app;
