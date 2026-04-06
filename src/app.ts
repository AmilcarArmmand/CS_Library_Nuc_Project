import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/env.js';
import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';

// Import database connection
import connectDatabase from './db/database.js';

// Import authentication
import passport from './config/passport.js';
//import sessionConfig from './config/session.js';

// Import route modules
import authRoutes from './routes/auth.js';
import homeRoutes from './routes/home.js';
import contactRoutes from './routes/contact.js';
import dashboardRoutes from './routes/dashboard.js';
//import bookRoutes from './routes/book.js';
//import catalogRoutes from './routes/catalog.js';

// Import middleware
import { attachUser } from './middleware/auth.js';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config().PORT || 3000;
const NODE_ENV = config().NODE_ENV;

// Connect to PostgreSQL
await connectDatabase();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



// Session config (must come before passport)
//app.use(sessionConfig);
// Session configuration
app.use(session({
  secret: config().SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production', // HTTPS only in production
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));


// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Attach user to all templates
app.use(attachUser);

// Custom middleware for logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Use route modules
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/', homeRoutes);
app.use('/', contactRoutes);
app.use('/', dashboardRoutes);
app.use('/', homeRoutes);
app.use('/', contactRoutes);
//app.use(router);

// 404 Error Handler
app.use((req, res) => {
  console.log(`404 - Page not found: ${req.method} ${req.originalUrl}`);
  res.status(404).render('404', {
    title: '404 - Page Not Found',
    currentPage: '404'
  });
});

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: 'Connected',
        environment: NODE_ENV
    });
});


// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);
  console.error('Stack:', err.stack);
  console.error('Path:', req.path);
  console.error('Method:', req.method);

  // Don't leak error details in production
  const isProduction = config().NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

app.use(errorHandler);

export default app;
