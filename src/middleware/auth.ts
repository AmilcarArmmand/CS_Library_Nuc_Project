// Authentication middleware for protecting routes

export const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    // Store the requested URL to redirect after login
    req.session.returnTo = req.originalUrl;

    // Redirect to login
    res.redirect('/auth/google');
};

export const requireNoAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }

    // If user is already logged in, redirect to dashboard
    res.redirect('/dashboard');
};

export const attachUser = (req, res, next) => {
    // Make user available in all templates
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
};

// Admin middleware (for future use if needed)
export const requireAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }

    res.status(403).render('pages/error', {
        title: 'Access Denied',
        error: 'You do not have permission to access this page.'
    });
};
