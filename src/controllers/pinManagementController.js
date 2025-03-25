const { Op } = require('sequelize');
const VertexPin = require('../models/vertexPin');
const User = require('../models/user');
const crypto = require('crypto');

// Generate unique alphanumeric pin
const generateUniquePin = async () => {
    let pin;
    let isUnique = false;
    
    while (!isUnique) {
        // Generate 8-digit alphanumeric pin
        pin = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        // Check if pin exists
        const existingPin = await VertexPin.findOne({ where: { pin } });
        if (!existingPin) {
            isUnique = true;
        }
    }
    
    return pin;
};

// List pins with pagination and filters
exports.listPins = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Build filter conditions
        const where = {};
        if (req.query.assigned_to) {
            where.assigned_to = req.query.assigned_to;
        }
        if (req.query.used_by) {
            where.used_by = req.query.used_by;
        }
        if (req.query.created_date) {
            where.created_date = {
                [Op.between]: [
                    new Date(req.query.created_date),
                    new Date(new Date(req.query.created_date).setHours(23, 59, 59))
                ]
            };
        }
        if (req.query.assigned_date) {
            where.assigned_date = {
                [Op.between]: [
                    new Date(req.query.assigned_date),
                    new Date(new Date(req.query.assigned_date).setHours(23, 59, 59))
                ]
            };
        }
        if (req.query.used_date) {
            where.used_date = {
                [Op.between]: [
                    new Date(req.query.used_date),
                    new Date(new Date(req.query.used_date).setHours(23, 59, 59))
                ]
            };
        }

        // Get pins with pagination
        const { count, rows: pins } = await VertexPin.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'name', 'user_type'],
                    required: false
                },
                {
                    model: User,
                    as: 'usedUser',
                    attributes: ['id', 'name', 'user_type'],
                    required: false
                }
            ],
            order: [['created_date', 'DESC']],
            limit,
            offset
        });

        // Get users for filters
        const users = await User.findAll({
            where: {
                user_type: {
                    [Op.in]: ['member', 'admin']
                }
            },
            attributes: ['id', 'name', 'user_type']
        });

        res.render('pin-management/list', {
            title: 'Pin Management - Vertex Admin',
            currentPage: 'pin-management',
            pins,
            users,
            pagination: {
                page,
                pageCount: Math.ceil(count / limit),
                limit
            },
            filters: req.query
        });
    } catch (error) {
        console.error('Error in listPins:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pins' });
    }
};

// Create new pins
exports.createPins = async (req, res) => {
    try {
        const { count, assigned_to } = req.body;
        const pins = [];

        // Generate pins
        for (let i = 0; i < count; i++) {
            const pin = await generateUniquePin();
            const pinData = {
                pin,
                status: assigned_to ? 'assigned' : 'available',
                assigned_to: assigned_to || null,
                assigned_date: assigned_to ? new Date() : null
            };
            pins.push(pinData);
        }

        // Bulk create pins
        await VertexPin.bulkCreate(pins);

        res.json({ success: true, message: `${count} pins created successfully` });
    } catch (error) {
        console.error('Error in createPins:', error);
        res.status(500).json({ success: false, message: 'Failed to create pins' });
    }
};

// Bulk assign pins
exports.assignPins = async (req, res) => {
    try {
        const { pin_ids, assigned_to } = req.body;

        // Update pins
        await VertexPin.update({
            assigned_to,
            assigned_date: new Date(),
            status: 'assigned'
        }, {
            where: {
                id: {
                    [Op.in]: pin_ids
                },
                status: 'available'
            }
        });

        res.json({ success: true, message: 'Pins assigned successfully' });
    } catch (error) {
        console.error('Error in assignPins:', error);
        res.status(500).json({ success: false, message: 'Failed to assign pins' });
    }
};
