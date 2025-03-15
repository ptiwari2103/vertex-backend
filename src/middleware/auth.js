const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        if (!req.session.user || !req.session.token) {
            return res.redirect('/auth/login');
        }

        const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
        
        // Verify token matches session user
        if (decoded.id !== req.session.user.id) {
            throw new Error('Token mismatch');
        }

        req.user = req.session.user;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        req.session.destroy((error) => {
            if (error) {
                console.error('Session destruction error:', error);
            }
            res.clearCookie('token');
            res.redirect('/auth/login');
        });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.user_type === 'admin') {
        next();
    } else {
        res.status(403).render('error', { 
            message: 'Access denied. Admin only.',
            title: 'Error - Vertex Admin'
        });
    }
};


module.exports = {
    verifyToken,
    isAdmin
};