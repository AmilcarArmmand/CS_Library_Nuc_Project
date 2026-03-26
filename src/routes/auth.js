import express from 'express';
import passport from '../config/passport.js';
import { requireNoAuth } from '../middleware/auth.js';

const router = express.Router();

// Google OAuth login route
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback route
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        // Successful authentication
        console.log('✅ Authentication successful for:', req.user.email);

        // Redirect to originally requested page or dashboard
        const redirectTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;

        res.redirect(redirectTo);
    }
);

// Login page (for manual login or errors)
router.get('/login', (req, res) => {
    res.render('pages/login', {
        title: 'Login',
        error: req.query.error || null,
        projectName: 'Your Team Project'
    });
});

// Logout route
router.get('/logout', (req, res) => {
    const userEmail = req.user ? req.user.email : 'Unknown user';

    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }

        console.log('👋 User logged out:', userEmail);
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
            res.clearCookie('connect.sid');
            res.redirect('/?message=logged_out');
        });
    });
});

export default router;
