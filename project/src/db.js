// Import required modules
import Database from 'better-sqlite3';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize the database connection
const db = new Database(process.env.DB_PATH);

/**
 * Initialize the database tables
 * - Creates the `books` and `borrows` tables if they do not exist
 */
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE NOT NULL,
      available BOOLEAN DEFAULT TRUE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS borrows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      borrow_date DATE NOT NULL,
      return_date DATE NOT NULL,
      returned BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (book_id) REFERENCES books (id)
    )
  `);
}

// ===============================
// Book Management Functions
// ===============================

/**
 * Adds a new book to the library
 * @param {string} title - Title of the book
 * @param {string} author - Author of the book
 * @param {string} isbn - ISBN number of the book
 */
export function addBook(title, author, isbn) {
  const stmt = db.prepare('INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)');
  return stmt.run(title, author, isbn);
}

/**
 * Retrieves all books in the library
 * @returns {Array} List of all books
 */
export function getAllBooks() {
  return db.prepare('SELECT * FROM books').all();
}

/**
 * Retrieves a book by its ID
 * @param {number} id - Book ID
 * @returns {Object|null} Book record or null if not found
 */
export function getBookById(id) {
  return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
}

/**
 * Updates a book's details
 * @param {number} id - Book ID
 * @param {Object} updateData - Data to update (title, author, isbn)
 * @returns {Object|null} Updated book record or null if not found
 */
export function updateBook(id, { title, author, isbn }) {
  const book = getBookById(id);
  if (!book) return null;

  const updates = [];
  const values = [];

  if (title) {
    updates.push('title = ?');
    values.push(title);
  }
  if (author) {
    updates.push('author = ?');
    values.push(author);
  }
  if (isbn) {
    updates.push('isbn = ?');
    values.push(isbn);
  }

  values.push(id);
  const stmt = db.prepare(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0 ? getBookById(id) : null;
}

/**
 * Deletes a book from the library
 * @param {number} id - Book ID
 * @returns {boolean} True if deletion was successful, false otherwise
 */
export function deleteBook(id) {
  const stmt = db.prepare('DELETE FROM books WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ===============================
// Borrow Management Functions
// ===============================

/**
 * Records a book borrowing transaction and updates book availability
 * @param {number} bookId - Book ID
 * @param {string} userEmail - Borrower's email address
 * @returns {Object} Borrow record details
 */
export function addBorrow(bookId, userEmail) {
  const book = getBookById(bookId);
  if (!book) throw new Error('Book not found');
  if (!book.available) throw new Error('Book is not available');

  const borrowDate = new Date();
  const returnDate = new Date();
  returnDate.setDate(returnDate.getDate() + 14); // 14-day return period

  db.prepare('UPDATE books SET available = FALSE WHERE id = ?').run(bookId);

  const stmt = db.prepare(`
    INSERT INTO borrows (book_id, user_email, borrow_date, return_date)
    VALUES (?, ?, ?, ?)
  `);

  return stmt.run(bookId, userEmail, borrowDate.toISOString(), returnDate.toISOString());
}

/**
 * Retrieves all pending (not yet returned) borrow records with due dates today or later
 * @returns {Array} List of pending borrows
 */
export function getPendingReturns() {
  const stmt = db.prepare(`
    SELECT b.*, books.title, books.author
    FROM borrows b
    JOIN books ON b.book_id = books.id
    WHERE b.returned = FALSE AND b.return_date >= date('now')
  `);

  return stmt.all();
}

/**
 * Retrieves all overdue borrow records (return date is in the past)
 * @returns {Array} List of overdue borrows
 */
export function getOverdueBooks() {
  const stmt = db.prepare(`
    SELECT b.*, books.title, books.author
    FROM borrows b
    JOIN books ON b.book_id = books.id
    WHERE b.returned = FALSE AND b.return_date < date('now')
  `);

  return stmt.all();
}

/**
 * Marks a borrow record as returned and updates the book's availability
 * @param {number} borrowId - Borrow record ID
 * @returns {boolean} True if marked as returned successfully, false otherwise
 */
export function markAsReturned(borrowId) {
  const borrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrowId);
  if (!borrow) throw new Error('Borrow record not found');

  db.prepare('UPDATE books SET available = TRUE WHERE id = ?').run(borrow.book_id);

  const stmt = db.prepare('UPDATE borrows SET returned = TRUE WHERE id = ?');
  const result = stmt.run(borrowId);
  return result.changes > 0;
}
