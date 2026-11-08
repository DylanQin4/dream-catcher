import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet'
import { initDatabase } from './config/database-init.js';
import pool from './config/database.js';
import dreamsRouter from './routes/dreams.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();

if (process.env.NODE_ENV === 'production'){
  app.use(helmet());
}

const PORT = process.env.PORT || 3000;
 
// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));


// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      uptime: process.uptime()
    })
  }
});

// API Routes
app.use('/api/dreams', dreamsRouter);

// Initialize database then start server
let server;

initDatabase().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});


async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Closing server...`);
  // Close the server to stop accepting new connections
  if (server) {
    server.close(async () => {
      console.log('Server closed.');
      // Close the database pool
      try {
        await pool.end();
        console.log('Database pool closed.');
      } catch (error) {
        console.error('Error closing database pool:', error);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Handle termination signals for graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
