const { Card, User } = require("../models");
const { Op } = require('sequelize');

const addCard = async (req, res) => {
    try {
        const { user_id } = req.body;

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
            user_id: user.id
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


const requestCard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Build filter conditions
        const whereClause = {
            status: 'Pending'
        };

        //whereClause.user_id = { [Op.gt]: 0 };

        if (req.query.user_id) {
            //whereClause.user_id = req.query.user_id;
            whereClause['$user.user_id$'] = { [Op.like]: `%${req.query.user_id}%` };
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

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        // Render the cards list page
        res.render('cards/request', {
            cards,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'requestcard',
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
        const whereClause = {
            status: { [Op.ne]: 'Pending' }
        };

        if (req.query.user_id) {
            whereClause['$user.user_id$'] = { [Op.like]: `%${req.query.user_id}%` };
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
                    attributes: ['id', 'name', 'user_id', 'account_number']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        
        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        // Render the cards list page
        res.render('cards/list', {
            cards,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'allcards',
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

const updateCard = async (req, res) => {
    try {
        // console.log("req.body", req.body);
        const { id, card_number,cvv_code, expiry_month, expiry_year, card_limit } = req.body;
        const card = await Card.findOne({ where: { id } });
        
        // console.log("card", card);
        
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }
        
        const assigned_date = new Date();
        const status = 'Approved';        
        await card.update({ card_number,cvv_code,expiry_month,expiry_year,assigned_date,card_limit,status });
        return res.status(200).json({ message: 'Card updated successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const updateCardStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Find the card
        const card = await Card.findOne({ where: { id } });
        
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }
        
        // Update the status
        await card.update({ status });
        
        return res.status(200).json({ message: 'Card status updated successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    addCard,
    getDetails,
    getAllCards,
    requestCard,
    updateCard,
    updateCardStatus
};