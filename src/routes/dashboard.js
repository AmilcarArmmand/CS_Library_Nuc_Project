import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
    res.render('pages/dashboard', {
        title: 'Dashboard',
        user: req.user,
        projectName: 'Your Team Project'
    });
});

// User profile page
router.get('/profile', requireAuth, (req, res) => {
    res.render('pages/profile', {
        title: 'My Profile',
        user: req.user,
        projectName: 'CS Library Nuc Project'
    });
});

/* Additional protected routes */
router.get('/settings', requireAuth, (req, res) => {
    res.render('pages/settings', {
        title: 'Settings',
        user: req.user,
        projectName: 'CS Library Nuc Project'
    });
});

export default router;
