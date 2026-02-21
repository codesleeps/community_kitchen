require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db/connection');
const { createTables } = require('./db/schema');
const { seedData } = require('./db/seed');

// Import routes
const serviceDayRoutes = require('./routes/public');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Community Kitchen API is running',
    timestamp: new Date().toISOString()
  });
});

// Public routes
app.use('/api/service-day', serviceDayRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Initialize database and start server
const initializeApp = async () => {
  try {
    // Initialize database connection
    await getDb();
    console.log('Database connection established');
    
    // Create tables
    createTables();
    
    // Seed initial data
    seedData();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🍳 Community Kitchen API`);
      console.log(`📍 Server running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  GET  /api/health`);
      console.log(`  GET  /api/service-day/today`);
      console.log(`  GET  /api/menu`);
      console.log(`  POST /api/orders`);
      console.log(`  GET  /api/orders/:id`);
      console.log(`  GET  /api/admin/orders?date=YYYY-MM-DD`);
      console.log(`  PATCH /api/admin/orders/:id/status`);
      console.log(`  GET  /api/admin/summary?date=YYYY-MM-DD`);
      console.log(`  GET  /api/admin/service-day/:date`);
      console.log(`  PATCH /api/admin/service-day/:date`);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
};

initializeApp();

module.exports = app;
