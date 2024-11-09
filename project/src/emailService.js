// Import necessary modules
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { config } from 'dotenv';
import { getPendingReturns, getOverdueBooks } from './db.js';

// Configure environment variables
config();

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an email notification when a book is borrowed
 * @param {string} userEmail - Email of the user
 * @param {string} bookTitle - Title of the borrowed book
 * @param {string} returnDate - Due date for the book
 */
export async function sendBorrowEmail(userEmail, bookTitle, returnDate) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: userEmail,
    subject: 'Library Book Borrowed',
    text: `You have borrowed "${bookTitle}". Please return it by ${returnDate}. The book is due in 14 days.`,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Sends a reminder email for books due soon
 * @param {string} userEmail - Email of the user
 * @param {string} bookTitle - Title of the borrowed book
 * @param {string} returnDate - Due date for the book
 */
export async function sendReminderEmail(userEmail, bookTitle, returnDate) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: userEmail,
    subject: 'Library Book Return Reminder',
    text: `Reminder: Your borrowed book "${bookTitle}" is due on ${returnDate}. Please return it on time to avoid late fees.`,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Sends an overdue notice email for books not returned on time
 * @param {string} userEmail - Email of the user
 * @param {string} bookTitle - Title of the borrowed book
 * @param {string} returnDate - Due date for the book
 */
export async function sendOverdueEmail(userEmail, bookTitle, returnDate) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: userEmail,
    subject: 'Library Book Overdue Notice',
    text: `OVERDUE NOTICE: Your borrowed book "${bookTitle}" was due on ${returnDate}. Please return it immediately to avoid additional late fees.`,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Sets up scheduled tasks for sending reminder and overdue emails
 */
export function setupEmailCron() {
  // Daily reminder for books due soon (1-2 days before due date) at 9 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const pendingReturns = getPendingReturns();
      const today = new Date();

      for (const borrow of pendingReturns) {
        const returnDate = new Date(borrow.return_date);
        const daysUntilDue = Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24));

        // Send reminder for books due in 1-2 days
        if (daysUntilDue <= 2 && daysUntilDue > 0) {
          await sendReminderEmail(borrow.user_email, borrow.title, borrow.return_date);
        }
      }
    } catch (error) {
      console.error('Error sending reminder emails:', error);
    }
  });

  // Daily check for overdue books at 10 AM
  cron.schedule('0 10 * * *', async () => {
    try {
      const overdueBooks = getOverdueBooks();

      for (const borrow of overdueBooks) {
        await sendOverdueEmail(borrow.user_email, borrow.title, borrow.return_date);
      }
    } catch (error) {
      console.error('Error sending overdue emails:', error);
    }
  });
}
