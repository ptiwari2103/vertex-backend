const jwt = require('jsonwebtoken');

const isAuthenticated = (req, res, next) => {
    try {
        // Check both session and token cookie
        if (!req.session.user || !req.cookies.token) {
            return res.redirect('/auth/login');
        }

        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(req.cookies.token, jwtSecret);
        
        // Verify token data matches session user
        if (decoded.id !== req.session.user.id || 
            decoded.user_id !== req.session.user.user_id ||
            decoded.user_type !== req.session.user.user_type) {
            throw new Error('Token mismatch with session');
        }

        // Check if token is about to expire (less than 1 hour remaining)
        const tokenExp = new Date(decoded.exp * 1000);
        const now = new Date();
        const oneHour = 60 * 60 * 1000;

        if (tokenExp - now < oneHour) {
            // Generate new token
            const newToken = jwt.sign(
                { 
                    id: req.session.user.id,
                    user_id: req.session.user.user_id,
                    user_type: req.session.user.user_type,
                    name: req.session.user.name
                },
                jwtSecret,
                { expiresIn: '24h' }
            );

            // Update token cookie
            res.cookie('token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                sameSite: 'strict'
            });
        }

        // Add user data to res.locals for views
        res.locals.user = req.session.user;
        req.user = req.session.user;
        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.clearCookie('token');
        req.session.destroy();
        return res.redirect('/auth/login');
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.user_type !== 'admin') {
        return res.status(403).render('error', { 
            message: 'Access denied. Admin privileges required.',
            title: 'Error - Vertex Admin',
            error: 'You do not have permission to access this page.',
            style: '',
            script: '',
            user: null
        });
    }
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin
};