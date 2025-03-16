const jwt = require('jsonwebtoken');
const { User } = require("../models/index.js");

// Validate user ID format (SSDDXY - 6 digits)
const isValidUserId = (userId) => {
    return /^\d{6}$/.test(userId);
};

// Validate password requirements
const isValidPassword = (password) => {
    const minLength = 8;
    const maxLength = 50;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && 
           password.length <= maxLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
};

const login = async (req, res) => {
    try {
        const { user_id, password } = req.body;

        // Validate input format
        if (!isValidUserId(user_id)) {
            return res.render('login', { 
                error: 'User ID must be a 6-digit number',
                title: 'Login - Vertex Admin',
                style: '',
                script: '',
                user: null
            });
        }

        // if (!isValidPassword(password)) {
        //     return res.render('login', { 
        //         error: 'Password must be 8-50 characters with uppercase, lowercase, number, and special character',
        //         title: 'Login - Vertex Admin',
        //         style: '',
        //         script: '',
        //         user: null
        //     });
        // }

        // Find user
        const user = await User.findOne({
            where: {
                user_id,
                status: 'Active',
                user_type: 'admin'
            },
            attributes: ['id', 'name', 'password', 'user_type', 'user_id', 'status']
        });

        if (!user) {
            return res.render('login', { 
                error: 'Invalid User Id',
                title: 'Login - Vertex Admin',
                style: '',
                script: '',
                user: null
            });
        }

        // Validate password
        const isValidPass = await user.validatePassword(password);
        if (!isValidPass) {
            return res.render('login', { 
                error: 'Invalid Password',
                title: 'Login - Vertex Admin',
                style: '',
                script: '',
                user: null
            });
        }

        // Generate token with user data
        const token = jwt.sign(
            { 
                id: user.id,
                user_id: user.user_id, 
                user_type: user.user_type,
                name: user.name
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Set session data
        req.session.user = {
            id: user.id,
            user_id: user.user_id,
            name: user.name,
            user_type: user.user_type
        };

        // Set secure cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        });

        return res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        return res.render('login', { 
            error: 'An error occurred during login. Please try again.',
            title: 'Login - Vertex Admin',
            style: '',
            script: '',
            user: null
        });
    }
};

const logout = async (req, res) => {
    try {
        // Clear session
        await new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Clear token cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.redirect('/auth/login');
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/auth/login');
    }
};

const showLoginForm = (req, res) => {
    // Redirect to dashboard if already logged in
    if (req.session.user && req.cookies.token) {
        return res.redirect('/dashboard');
    }

    res.render('login', { 
        error: undefined,
        title: 'Login - Vertex Admin',
        style: '',
        script: '',
        user: null
    });
};

module.exports = {
    showLoginForm,
    login,
    logout
};