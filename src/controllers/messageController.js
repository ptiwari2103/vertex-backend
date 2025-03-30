const { VertexMessage, User } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/message';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('image');

exports.getAllMessages = async (req, res) => {
    console.log('getAllMessages');
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const sort_by = req.query.sort_by || 'created_at';
        const sort_order = req.query.sort_order || 'desc';

        // Validate sort parameters
        const validSortFields = ['subject', 'created_by', 'created_at', 'status'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = ['asc', 'desc'].includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

        // Get total count for pagination
        const totalCount = await VertexMessage.count();

        // Get messages with pagination and sorting
        const messages = await VertexMessage.findAll({
            include: [{
                model: User,
                as: 'createdByUser',
                attributes: ['name']
            }],
            order: [[sortField, sortOrder]],
            limit: limit,
            offset: offset
        });

        const members = await User.findAll({
            attributes: ['id', 'name'],
            where: { 
                status: { [Op.in]: ['active', 'approved'] } 
            }
        });

        // For EJS template
        res.render('messages/list', {
            messages,
            members,
            total: totalCount,
            currentPage: "messages",
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                itemsPerPage: limit
            },
            sort: { field: sortField, order: sortOrder }
        });
    } catch (error) {
        console.error('Error in getAllMessages:', error);
        res.status(500).render('error', { error: error.message });
    }
};

exports.createMessage = async (req, res) => {
    upload(req, res, async (err) => {
        try {
            if (err instanceof multer.MulterError) {
                throw new Error('File upload error: ' + err.message);
            } else if (err) {
                throw new Error(err.message);
            }

            const { subject, message, send_to, status } = req.body;
            console.log(subject, message, send_to, status, req.session.user);
            console.log(req.session.user?.id);
            if (!message) {
                throw new Error('Message is required');
            }

            const sendToArray = typeof send_to === 'string' ? JSON.parse(send_to) : send_to;
            console.log(sendToArray);
            const newMessage = await VertexMessage.create({
                subject,
                message,
                image: req.file ? req.file.path : null,
                created_by: req.session.user?.id || 2, // Default to 1 if no user in request
                send_to: sendToArray,
                status: status || 'Active', // Changed to match model's case
                created_at: new Date()
            });

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(201).json({
                    success: true,
                    message: 'Message created successfully',
                    data: newMessage
                });
            }

            // Redirect back to message list for form submissions
            res.redirect('/messages/list');
        } catch (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Error in createMessage:', error);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ error: error.message });
            }
            res.status(500).render('error', { error: error.message });
        }
    });
};