import express from 'express';
import { addBorrow, markAsReturned, getBookById } from '../db.js';
import { sendBorrowEmail } from '../emailService.js';

export const borrowRouter = express.Router();

borrowRouter.post('/borrow', async (req, res) => {
  try {
    const { bookId, userEmail } = req.body;

    if (!bookId || !userEmail) {
      return res.status(400).json({ error: 'Book ID and user email are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const book = await getBookById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const borrow = await addBorrow(bookId, userEmail);
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 14);

    await sendBorrowEmail(userEmail, book.title, returnDate.toISOString());

    res.json({ 
      message: 'Book borrowed successfully', 
      borrow,
      returnDate: returnDate.toISOString()
    });
  } catch (error) {
    if (error.message === 'Book is not available') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

borrowRouter.post('/return/:borrowId', async (req, res) => {
  try {
    const { borrowId } = req.params;
    const result = await markAsReturned(borrowId);
    if (!result) {
      return res.status(404).json({ error: 'Borrow record not found' });
    }
    res.json({ message: 'Book returned successfully' });
  } catch (error) {
    if (error.message === 'Borrow record not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});
