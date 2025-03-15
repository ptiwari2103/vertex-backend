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
            include: [
                {
                    model: State,
                    attributes: ['name']
                },
                {
                    model: District,
                    attributes: ['name']
                }
            ]
        });

        res.render('dashboard', {
            user: userDetails,
            counts: {
                users: userCount,
                states: stateCount,
                districts: districtCount
            },
            title: 'Dashboard - Vertex Admin'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', { 
            message: 'Error loading dashboard',
            title: 'Error - Vertex Admin'
        });
    }
};

module.exports = getDashboard;
