import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// User dashboard - protected route
router.get('/', requireAuth, (req, res) => {
    res.render('pages/dashboard', {
        title: 'Dashboard',
        user: req.user,
        projectName: 'CS Library Project'
    });
});

// User profile page
router.get('/profile', requireAuth, (req, res) => {
    res.render('pages/profile', {
        title: 'My Profile',
        user: req.user,
        projectName: 'CS Library Project'
    });
});

// Additional protected routes for your project features
router.get('/settings', requireAuth, (req, res) => {
    res.render('pages/settings', {
        title: 'Settings',
        user: req.user,
        projectName: 'CS Library Project'
    });
});

export default router;
