const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./src/models');
const userRoutes = require('./src/routes/userRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
// const adminRoutes = require('./src/routes/adminRoutes');
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const session = require('express-session');

require("dotenv").config();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));


// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
      return res.redirect('/auth/login');
  }
  next();
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.user_type !== 'admin') {
      return res.render('error', {
          message: 'Access denied. Admin only.',
          title: 'Error - Vertex Admin'
      });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
      res.redirect('/dashboard');
  } else {
      res.redirect('/auth/login');
  }
});

// Apply authentication middleware to protected routes
app.use('/auth', authRoutes);
app.use('/dashboard', requireAuth, requireAdmin, dashboardRoutes);
app.use('/members', requireAuth, requireAdmin, userRoutes);

// Routes
app.use('/', userRoutes);
app.use('/', locationRoutes);
// app.use('/', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 5001;
const BACKUP_PORT = 5002; // Backup port if primary is in use

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models with database
    await sequelize.sync();
    console.log('Database models synchronized successfully.');

    // Try primary port first
    try {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    } catch (error) {
      // If primary port fails, try backup port
      console.log(`Port ${PORT} is in use, trying backup port ${BACKUP_PORT}`);
      app.listen(BACKUP_PORT, () => {
        console.log(`Server is running on backup port ${BACKUP_PORT}`);
      });
    }
  } catch (error) {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
  process.exit(0);
});

startServer();
