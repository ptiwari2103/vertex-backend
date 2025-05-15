const { User, Profile, UserBank, State, District } = require('../models/index.js');

const getDashboard = async (req, res) => {
    try {
        // Get counts for dashboard
        const [userCount, stateCount, districtCount] = await Promise.all([
            User.count({ where: { user_type: 'member' } }),
            State.count(),
            District.count()
        ]);

        // Get current user details
        const userDetails = await User.findOne({
            where: { id: req.session.user.id },
            attributes: ['id', 'name', 'user_id', 'user_type', 'status']
        });

        res.render('dashboard', {
            title: process.env.DASHBOARD_TITLE,
            style: '',
            script: '',
            currentPage: 'dashboard',
            user: userDetails,
            counts: {
                users: userCount,
                states: stateCount,
                districts: districtCount
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', { 
            title: 'Error - Vertex Admin',
            message: 'Error loading dashboard',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading the dashboard.',
            style: '',
            script: '',
            user: null
        });
    }
};

module.exports = {
    getDashboard
};
