const { VertexPin, User } = require("../models");
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Generate a unique 8-digit alphanumeric pin
const generateUniquePin = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pin;
    let isUnique = false;

    while (!isUnique) {
        pin = '';
        for (let i = 0; i < 8; i++) {
            pin += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Check if this pin already exists
        const existingPin = await VertexPin.findOne({ where: { pin } });
        if (!existingPin) {
            isUnique = true;
        }
    }

    return pin;
};

// Get all pins with pagination and filters
const getAllPins = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Build filter conditions
        const whereClause = {};
        if (req.query.assigned_to) {
            whereClause.assigned_to = req.query.assigned_to;
        }
        if (req.query.used_by) {
            whereClause.used_by = { [Op.like]: `%${req.query.used_by}%` };
        }
        if (req.query.created_date) {
            whereClause.created_at = {
                [Op.gte]: new Date(req.query.created_date),
                [Op.lt]: new Date(new Date(req.query.created_date).getTime() + 24 * 60 * 60 * 1000)
            };
        }
        if (req.query.assigned_date) {
            whereClause.assigned_date = {
                [Op.gte]: new Date(req.query.assigned_date),
                [Op.lt]: new Date(new Date(req.query.assigned_date).getTime() + 24 * 60 * 60 * 1000)
            };
        }
        if (req.query.used_date) {
            whereClause.used_date = {
                [Op.gte]: new Date(req.query.used_date),
                [Op.lt]: new Date(new Date(req.query.used_date).getTime() + 24 * 60 * 60 * 1000)
            };
        }

        // Get pins with pagination
        const { count, rows: pins } = await VertexPin.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'usedUser',
                    attributes: ['id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        // Get all users for dropdowns
        const users = await User.findAll({
            attributes: ['id', 'user_id', 'name'],
            order: [['name', 'ASC']]
        });

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        // Render the pins list page
        res.render('pins/list', {
            pins,
            users,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'pins',
            pagination: {
                currentPage: page,
                totalPages,
                totalPins: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create new pins
const createPins = async (req, res) => {
    try {
        const { pin_count, assigned_to = null } = req.body;

        if (!pin_count || isNaN(pin_count) || pin_count < 1) {
            return res.status(400).json({ error: 'Invalid pin count' });
        }

        // Validate assigned_to user exists if provided
        if (assigned_to) {
            const user = await User.findOne({ where: { id: assigned_to } });
            if (!user) {
                return res.status(400).json({ error: 'Invalid user selected for assignment' });
            }
        }

        const pins = [];
        for (let i = 0; i < pin_count; i++) {
            const pin = await generateUniquePin();
            pins.push({
                pin,
                assigned_to,
                assigned_date: assigned_to ? new Date() : null
            });
        }

        await VertexPin.bulkCreate(pins);
        res.json({ message: `Successfully created ${pin_count} pins` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bulk assign pins
const bulkAssignPins = async (req, res) => {
    try {
        const { pin_ids, assigned_to } = req.body;
        // console.log(req.body);
        if (!pin_ids || !Array.isArray(pin_ids) || pin_ids.length === 0) {
            return res.status(400).json({ error: 'No pins selected' });
        }

        if (!assigned_to) {
            return res.status(400).json({ error: 'Assigned to is required' });
        }

        // Validate assigned_to user exists
        const user = await User.findOne({ where: { id: assigned_to } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid user selected for assignment' });
        }

        await VertexPin.update(
            {
                assigned_to,
                assigned_date: new Date()
            },
            {
                where: {
                    id: { [Op.in]: pin_ids },
                    [Op.or]: [
                        { assigned_to: 0 },
                        { assigned_to: null }
                    ]
                }
            }
        );

        res.json({ message: 'Successfully assigned pins' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get assigned pins
const getAssignedPins = async (req, res) => {
    try {
        const { 
            user_id,
            page = 1,
            limit = 10,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;
        console.log(user_id, page, limit, sort_by, sort_order);
        if (!user_id) {
            return res.status(400).json({ error: 'User_id is required' });
        }

        // Calculate offset for pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Validate sort parameters
        const validSortFields = ['used_by', 'created_at', 'assigned_date', 'used_date'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = ['asc', 'desc'].includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

        console.log("sortField", sortField, "sortOrder", sortOrder);  // Debugging    
        console.log("offset", offset, "limit", limit); 
        // Get total count for pagination
        const totalCount = await VertexPin.count({
            where: {
                assigned_to: user_id
            }
        });

        // Get pins with pagination and sorting
        const pins = await VertexPin.findAll({
            where: {
                assigned_to: user_id
            },
            include: [
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'usedUser',
                    attributes: ['id', 'name']
                }
            ],
            order: [[sortField, sortOrder]],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            pins,
            total: totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit))
        });
    } catch (error) {
        console.error('Error in getAssignedPins:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllPins,
    createPins,
    bulkAssignPins,
    getAssignedPins
};