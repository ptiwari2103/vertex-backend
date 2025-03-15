const expressLayouts = require('express-ejs-layouts');
const path = require('path');

module.exports = (app) => {
    // Enable EJS Layouts
    app.use(expressLayouts);
    
    // Set layout defaults
    app.set('layout', false);
    
    // Middleware to set layout based on route
    app.use((req, res, next) => {
        // Get the path for layout selection
        res.locals.path = req.path;
        
        // Set layout based on route
        if (req.path.startsWith('/admin')) {
            res.locals.layout = 'layouts/admin';
            // Set default title if not set
            res.locals.title = res.locals.title || 'Admin Dashboard';
            // Ensure admin data is available
            res.locals.admin = req.session.admin || {};
        } else if (!req.path.startsWith('/auth')) {
            res.locals.layout = 'layouts/user';
            // Set default title if not set
            res.locals.title = res.locals.title || 'Member Portal';
            // Ensure user data is available
            res.locals.user = req.session.user || {};
        }
        
        next();
    });
};
