import express from 'express';
import { addBook, getAllBooks, getBookById, deleteBook, updateBook } from '../db.js';

export const bookRouter = express.Router();

bookRouter.post('/books', async (req, res) => {
  try {
    const { title, author, isbn } = req.body;

    if (!title || !author || !isbn) {
      return res.status(400).json({ error: 'Title, author, and ISBN are required' });
    }

    // ISBN validation (basic example)
    if (!/^\d{3}-\d{1,5}-\d{1,7}-\d{1,7}-\d{1,7}$/.test(isbn)) {
      return res.status(400).json({ error: 'Invalid ISBN format' });
    }

    const book = await addBook(title, author, isbn);
    res.status(201).json({ message: 'Book added successfully', book });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Book with this ISBN already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

bookRouter.get('/books', async (req, res) => {
  try {
    const books = await getAllBooks();
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

bookRouter.get('/books/:id', async (req, res) => {
  try {
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

bookRouter.put('/books/:id', async (req, res) => {
  try {
    const { title, author, isbn } = req.body;
    const bookId = req.params.id;

    if (!title && !author && !isbn) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }

    const book = await updateBook(bookId, { title, author, isbn });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book updated successfully', book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

bookRouter.delete('/books/:id', async (req, res) => {
  try {
    const result = await deleteBook(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
