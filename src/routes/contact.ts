import express from 'express';
import { body, validationResult } from 'express-validator';
const router = express.Router();

router.get('/contact', (req, res) => {
  res.render('pages/contact', {
    title: 'Contact',
    currentPage: 'contact',
    message: '',
    errors: [],
    formData: {}
  });
});

router.post('/contact',
  body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),

  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('pages/contact', {
        title: 'Contact',
        currentPage: 'contact',
        message: '',
        errors: errors.array(),
        formData: req.body
      });
    }

    // TODO: Send email or save to database
    console.log('Contact form submitted:', req.body);

    res.render('pages/success', {
      title: 'Success',
      currentPage: 'contact',
      message: 'Thank you for your message! We will get back to you soon.'
    });
  }
);

export default router;
