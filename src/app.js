import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/* Import authentication */
import passport from './config/passport.js';
import sessionConfig from './config/session.js';

/* Import routes */
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';

/* Import middleware */
import { attachUser } from './middleware/auth.js';

/* ES modules __dirname equivalent */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Load environment variables */
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware (must come before passport)
app.use(sessionConfig);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Attach user to all templates
app.use(attachUser);

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// Home route - updated to handle logged-in users
app.get('/', (req, res) => {
    const message = req.query.message === 'logged_out'
        ? 'You have been successfully logged out.'
        : 'Development environment setup complete!';

    res.render('pages/index', {
        title: 'CS330 Team Project',
        message: message,
        user: req.user || null,
        projectName: 'Your Team Project Name'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error', {
        title: 'Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
        projectName: 'Your Team Project Name'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('pages/error', {
        title: 'Page Not Found',
        error: 'The page you are looking for does not exist.',
        projectName: 'Your Team Project Name'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Team Project running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔐 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
});

export default app;
