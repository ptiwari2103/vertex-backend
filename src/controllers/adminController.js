const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Profile } = require("../models");

const renderLoginPage = (req, res) => {
    res.render('login', { error: null });
};

const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.render('login', { error: 'User_id and password are required' });
        }        
        
        // Find admin user
        const admin = await User.findOne({
            where: { 
                user_type: 'admin',
                user_id: username 
            }
        });


        //Check if user exists and verify password
        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            return res.render('login', { error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: admin.user_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set token in cookie or session
        res.cookie('token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred during login '+error });
    }
};

const renderDashboard = (req, res) => {
    res.render('dashboard');
};

module.exports = {
    renderLoginPage,
    adminLogin,
    renderDashboard
};
