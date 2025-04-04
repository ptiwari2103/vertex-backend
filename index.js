const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const { sequelize } = require('./src/models');
const userRoutes = require('./src/routes/userRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const pinRoutes = require('./src/routes/pinRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const cardRoutes = require('./src/routes/cardRoutes');

require("dotenv").config();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);

// Security middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret'));

// Static files
// app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use('/uploads', express.static('uploads'));


// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    }
}));

// Pass user to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Auth routes (public)
app.use('/auth', authRoutes);

// Message routes (public)
app.use('/messages', messageRoutes);

// Protected routes
app.use('/dashboard', dashboardRoutes);
app.use('/members', userRoutes);
app.use('/locations', locationRoutes);
app.use('/pins', pinRoutes);
app.use('/cards', cardRoutes);

// Error handling middleware
app.use((req, res, next) => {
    res.status(404).render('error', {
        title: 'Error - Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: 'Please check the URL or go back to the dashboard.'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).render('error', {
        title: 'Error - Server Error',
        message: 'An error occurred while processing your request.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later.'
    });
});

// Initialize database and start server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Sync models with database
        await sequelize.sync();
        console.log('Database models synchronized successfully.');

        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.info('SIGTERM signal received.');
    await sequelize.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.info('SIGINT signal received.');
    await sequelize.close();
    process.exit(0);
});

startServer();
