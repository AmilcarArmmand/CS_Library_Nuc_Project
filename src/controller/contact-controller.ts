import type { Request, Response } from 'express';
import config from '../config/env.js';


export const contact = (req: Request, res: Response) => {
  res.render('contact', {
    title: 'Contact Us',
    description: 'Get in touch with us for any inquiries or support.',
    contactEmail: config().EMAIL_FROM,
    formData: {}
  });
};

export const submitContactForm = async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      res.status(400).json({
        success: false,
        message: 'Please fill in all fields.'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
      return;
    }

    // Simulate async email sending (replace with actual email service)
    await sendEmail({ name, email, message });

    res.status(200).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again later.'
    });
  }
};

interface EmailData {
  name: string;
  email: string;
  message: string;
}

async function sendEmail(data: EmailData): Promise<void> {
  // Simulate async email sending operation
  // Replace this with actual email service integration (e.g., Nodemailer, SendGrid)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Email sent:', {
    to: config().EMAIL_FROM,
    from: data.email,
    subject: `Contact form submission from ${data.name}`,
    body: data.message
  });
}
