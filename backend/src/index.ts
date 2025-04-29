import fastify from 'fastify';
import cors from '@fastify/cors';
import { initializeDatabase } from './db/config';
import nodeRoutes from './routes/nodeRoutes';

// Initialize fastify server
const server = fastify({ logger: true });

// Register CORS to allow frontend to communicate with the API
server.register(cors, {
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow DELETE method
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Initialize database before starting the server
const start = async () => {
  try {
    // Initialize SQLite database with tables and initial data
    await initializeDatabase();
    console.log('Database initialized');
    
    // Register routes
    await server.register(nodeRoutes);
    
    // Start the server
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server is running on port 3001');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Start the server
start();