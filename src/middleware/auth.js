const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
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
        console.error('Token verification error:', err);
        req.session.destroy((error) => {
            if (error) {
                console.error('Session destruction error:', error);
            }
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            res.redirect('/auth/login');
        });
    }
};

const verifyApiToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, jwtSecret);

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp <= now) {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }

        // Add user data to request object
        req.user = {
            user_id: decoded.user_id,
            account_number: decoded.account_number,
            user_type: decoded.user_type
        };
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};


const verifyGiftDistributorToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer')) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, jwtSecret);

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        
        if (decoded.exp <= now) {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }
        
        // Add user data to request object
        req.user = {
            id: decoded.id,
            login_user_id: decoded.login_user_id
        };
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Your token have been expired."
        });
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
    verifyToken,
    verifyApiToken,
    isAdmin,
    verifyGiftDistributorToken
};