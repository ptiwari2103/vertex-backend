const { Card, User } = require("../models");
const { Op } = require('sequelize');

const addCard = async (req, res) => {
    try {
        const { user_id, card_number, card_last4, card_type, expiry_month, expiry_year, cvv_code } = req.body;

        // Check if user exists with status 'active' and 'approved'
        const user = await User.findOne({
            where: {
                user_id: user_id,
                user_type: 'member',
                [Op.or]: [
                    { status: 'Active' },
                    { status: 'Approved' }
                ]
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found or not eligible' });
        }

        // Create a new card entry
        const card = await Card.create({
            user_id: user.id,
            card_number,
            card_last4,
            card_type,
            expiry_month,
            expiry_year,
            cvv_code
        });

        return res.status(201).json({ message: 'Your request was successfully added.' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getDetails = async (req, res) => {
    console.log("req.query.user_id", req.query.user_id);
    try {
        const card = await Card.findOne({
            where: {
                user_id: req.query.user_id
            }
        });
        return res.status(200).json(card);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// const getAllCards = async (req, res) => {
//     try {
//         const cards = await Card.findAll();
//         return res.status(200).json(cards);
//     } catch (error) {
//         return res.status(500).json({ error: error.message });
//     }
// };

// Get all cards with pagination and filters
const getAllCardsBCK = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Build filter conditions
        const whereClause = {};

        whereClause.user_id = { [Op.gt]: 0 };

        if (req.query.user_id) {
            whereClause.user_id = req.query.user_id;
        }
        if (req.query.created_date) {
            whereClause.created_at = {
                [Op.gte]: new Date(req.query.created_date),
                [Op.lt]: new Date(new Date(req.query.created_date).getTime() + 24 * 60 * 60 * 1000)
            };
        }

        // Get cards with pagination
        const { count, rows: cards } = await Card.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });


        // Get all users for dropdowns
        const users = await User.findAll({
            attributes: ['id', 'user_id', 'name', 'user_type'],
            order: [['name', 'ASC']]
        });

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        // Render the cards list page
        res.render('cards/list', {
            cards,
            users,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'cards',
            query: req.query,
            pagination: {
                currentPage: page,
                totalPages,
                totalCards: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const getAllCards = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Build filter conditions
        const whereClause = {};

        whereClause.user_id = { [Op.gt]: 0 };

        if (req.query.user_id) {
            whereClause.user_id = req.query.user_id;
        }
        if (req.query.status) {
            whereClause.status = req.query.status;
        }
        if (req.query.created_date) {
            whereClause.created_at = {
                [Op.gte]: new Date(req.query.created_date),
                [Op.lt]: new Date(new Date(req.query.created_date).getTime() + 24 * 60 * 60 * 1000)
            };
        }

        // Get cards with pagination
        const { count, rows: cards } = await Card.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        // Get all users for dropdowns
        const users = await User.findAll({
            attributes: ['id', 'user_id', 'name', 'user_type'],
            order: [['name', 'ASC']]
        });

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        // Render the cards list page
        res.render('cards/list', {
            cards,
            users,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'cards',
            query: req.query,
            pagination: {
                currentPage: page,
                totalPages,
                totalCards: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    addCard,
    getDetails,
    getAllCards
};