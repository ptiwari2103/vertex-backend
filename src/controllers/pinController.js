const { User, Profile, UserBank, UserAddress } = require("../models");
const jwt = require('jsonwebtoken');
const multer = require('multer');

const generateUserId = async (districtId) => {
    const DD = String(districtId).padStart(2, '0'); // Ensure 2-digit district ID

    let userId;
    let isUnique = false;

    while (!isUnique) {
        const randomPart = String(Math.floor(1000 + Math.random() * 9000)); // Always 4 digits
        userId = `${DD}${randomPart}`;
        // Check if this userId already exists
        const existingUser = await User.findOne({ where: { user_id: userId } });        
        if (!existingUser) {
            isUnique = true;
        }
    }

    return userId; // Returns a 6-digit unique integer
};









const getAllPinsBCK = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const offset = (page - 1) * limit;

        const { count, rows: members } = await User.findAndCountAll({
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Profile,
                    as: 'profile',
                    attributes: ['id', 'pan_number', 'aadhar_number', 'kyc_status']
                },
                {
                    model: UserBank,
                    as: 'userBank',
                    attributes: ['id']
                }
            ],
            where: { user_type: 'member' },
            limit,
            offset,
            order: [['created_date', 'DESC']]
        });

        const totalPages = Math.ceil(count / limit);

        res.render('members/list', {
            title: 'Members - Vertex Admin',
            style: '',
            script: '',
            currentPage: 'members',
            user: JSON.stringify(req.session.user, null, 2),
            members:members,
            pagination: {
                current: page,
                total: totalPages,
                count: count
            }
        });
    } catch (error) {
        console.error('Members error:', error);
        res.render('error', { 
            title: 'Error - Vertex Admin',
            message: 'Error loading members',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading the members.',
            style: '',
            script: '',
            user: null
        });
    }
};

const getAllPins = async (req, res) => {
    try {
        const pins = await VertexPin.findAll();
        res.json(pins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllPins    
};