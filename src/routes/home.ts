import express from 'express';
const router = express.Router();


router.get('/', (req, res) => {
  // Redirect authenticated users to dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }

  res.render('pages/home', {
    title: 'Home',
    currentPage: 'home'
  });
});

router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About',
    currentPage: 'about'
  });
});

// Coming soon routes
router.get('/coming-soon', (req, res) => {
  res.render('pages/coming-soon', {
    title: 'Coming Soon',
    currentPage: 'coming-soon'
  });
});

router.get('/catalog', (req, res) => {
  res.render('pages/coming-soon', {
    title: 'Book search - Coming Soon',
    currentPage: 'catalog',
    feature: 'CS Library'
  });
});

export default router;
