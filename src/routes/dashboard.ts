import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// User dashboard - protected route
router.get('/dashboard', requireAuth, (req, res) => {
    res.render('pages/dashboard', {
        title: 'Dashboard',
        user: req.user,
        currentPage: 'dashboard',
        projectName: 'CS Library Project'
    });
});

// User profile page
router.get('/profile', requireAuth, (req, res) => {
    res.render('pages/profile', {
        title: 'My Profile',
        user: req.user,
        projectName: 'CS Library Project',
        currentPage: 'profile'
    });
});

// Additional protected routes for your project features
router.get('/settings', requireAuth, (req, res) => {
    res.render('pages/settings', {
        title: 'Settings',
        user: req.user,
        projectName: 'CS Library Project',
        currentPage: 'settings'
    });
});

// Admin dashboard - protected route
router.get('/admin', requireAuth, requireAdmin, (req, res) => {
    res.render('pages/admin-dashboard', {
        title: 'Admin Dashboard',
        user: req.user,
        projectName: 'CS Library Project',
        currentPage: 'admin'
    });
});

export default router;
