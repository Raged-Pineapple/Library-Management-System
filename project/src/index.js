import express from 'express';
import { config } from 'dotenv';
import { initDB } from './db.js';
import { setupEmailCron } from './emailService.js';
import { borrowRouter } from './routes/borrow.js';
import { bookRouter } from './routes/books.js';

// Load environment variables
config();

const app = express();
app.use(express.json());

// Initialize the SQLite database
initDB();

// Set up email notification cron jobs
setupEmailCron();

// Define API routes for borrowing and managing books
app.use('/api', borrowRouter);
app.use('/api', bookRouter);

// Start the server on a specified port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
