const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
const { User } = require("../models/index.js");

const login = async (req, res) => {
    try {
        const { user_id, password } = req.body;

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
                error: 'Invalid credentials or account not active',
                title: 'Login - Vertex Admin'
            });
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.render('login', { 
                error: 'Invalid credentials',
                title: 'Login - Vertex Admin'
            });
        }

        // Generate token
        const token = jwt.sign(
            { 
                id: user.id,
                user_id: user.user_id, 
                user_type: user.user_type,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set session and cookie
        req.session.token = token;
        req.session.user = {
            id: user.id,
            user_id: user.user_id,
            name: user.name,
            user_type: user.user_type
        };

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        return res.render('login', { 
            error: 'An error occurred during login',
            title: 'Login - Vertex Admin'
        });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.clearCookie('token');
        res.redirect('/auth/login');
    });
};

const showLoginForm = (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { 
        error: undefined,
        title: 'Login - Vertex Admin'
    });
};



module.exports = {
    showLoginForm,
    logout,
    login
};