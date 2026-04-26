import { Router } from "express";

import * as HealthController from "../controller/health-controller.js";
//import * as AboutController from "../controller/about-controller.js";
import * as ContactController from "../controller/contact-controller.js";
//import * as BookController from "../controller/book-controller.js";

const router = Router();

// About routes
//router.get('/about', AboutController.about);

// Contact routes
router.get('/contact', ContactController.contact);
router.post('/api/contact', ContactController.submitContactForm);

// Book API routes
//router.get('/api/books', BookController.getBooks);
//router.get('/api/books/:id', BookController.getBookById);
//router.post('/api/books', BookController.createBook);
//router.put('/api/books/:id', BookController.updateBook);
//router.delete('/api/books/:id', BookController.deleteBook);

// Health check
router.get("/health", HealthController.health);

export default router;
