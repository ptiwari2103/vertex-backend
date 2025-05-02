const { Gift, GiftDistributor, GiftReceived, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const jwt = require('jsonwebtoken');

// Render the gift list page
const renderGiftList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Get gifts with pagination
        const { count, rows: gifts } = await Gift.findAndCountAll({
            order: [['created_at', 'DESC']], 
            limit,
            offset
        });

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        // Render the gifts list page
        res.render('gifts/list', {
            gifts,
            user: req.session.user,
            currentPage: 'allgifts', 
            pagination: {
                currentPage: page,
                totalPages,
                totalGifts: count
            }
        });
    } catch (error) {
        console.error('Error fetching gifts:', error);
        res.status(500).json({ error: error.message });
    }
};

// Render the add gift page
const renderAddGift = (req, res) => {
    res.render('gifts/add', {
        user: req.session.user,
        currentPage: 'addgift' 
    });
};

// Render the edit gift page
const renderEditGift = async (req, res) => {
    try {
        const { id } = req.params;
        const gift = await Gift.findByPk(id);
        
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: 'Gift not found'
            });
        }
        
        res.render('gifts/edit', {
            gift,
            user: req.session.user,
            currentPage: 'allgifts' 
        });
    } catch (error) {
        console.error('Error fetching gift for edit:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create a new gift
const createGift = async (req, res) => {
    try {
        const giftData = {
            name: req.body.name,
            description: req.body.description,
            remaining: parseInt(req.body.quantity),
            quantity: parseInt(req.body.quantity),
            status: req.body.status
        };
        
        const newGift = await Gift.create(giftData);
        
        res.redirect('/gifts/list');
    } catch (error) {
        console.error('Error creating gift:', error);
        res.status(500).json({ error: error.message });
    }
};

const getGift = async (req, res) => {
    try {
        const { id } = req.params;
        const gift = await Gift.findByPk(id);
        
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: 'Gift not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: gift
        });
    } catch (error) {
        console.error('Error fetching gift:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch gift',
            error: error.message
        });
    }
};

const updateGift = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            name: req.body.name,
            description: req.body.description,
            quantity: parseInt(req.body.quantity),
            remaining: parseInt(req.body.remaining),
            status: req.body.status
        };
        //console.log(updateData);
        
        const gift = await Gift.findByPk(id);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: 'Gift not found'
            });
        }
        
        await gift.update(updateData);
        
        // If the request is from the form, redirect to the list page
        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            return res.redirect('/gifts/list');
        }
        
        // Otherwise, return JSON response for API calls
        res.status(200).json({
            success: true,
            message: 'Gift updated successfully',
            data: gift
        });
    } catch (error) {
        console.error('Error updating gift:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update gift',
            error: error.message
        });
    }
};

const deleteGift = async (req, res) => {
    try {
        const { id } = req.params;
        
        const gift = await Gift.findByPk(id);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: 'Gift not found'
            });
        }
        
        await gift.destroy();
        
        res.status(200).json({
            success: true,
            message: 'Gift deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting gift:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete gift',
            error: error.message
        });
    }
};

const listGifts = async (req, res) => {
    try {
        const gifts = await Gift.findAll({
            order: [['created_at', 'DESC']] 
        });
        
        res.status(200).json({
            success: true,
            data: gifts
        });
    } catch (error) {
        console.error('Error listing gifts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list gifts',
            error: error.message
        });
    }
};


const createDistributor = async (req, res) => {
    try {
        const { user_id, tmp_user } = req.body;
        let distributorData = {
            status: 'Active'
        };

        // Helper to generate random numeric string
        function generateNumeric(length) {
            let result = '';
            for (let i = 0; i < length; i++) {
                result += Math.floor(Math.random() * 10);
            }
            return result;
        }

        // Helper to generate random 8-digit password (numeric)
        function generatePassword() {
            return generateNumeric(8);
        }

        if (user_id) {
            // Case 1: User selected from dropdown
            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(400).json({ success: false, message: 'User not found' });
            }
            distributorData.tmp_user = null;
            distributorData.user_id = user.id;
            distributorData.login_user_id = user.user_id;
            distributorData.password = generatePassword();
        } else if (tmp_user) {
            // Case 2: Temporary user provided
            // Generate unique 6-digit login_user_id
            let login_user_id;
            let isUnique = false;
            while (!isUnique) {
                login_user_id = generateNumeric(6);
                // Check uniqueness in GiftDistributor table
                const existing = await GiftDistributor.findOne({ where: { login_user_id } });
                if (!existing) isUnique = true;
            }
            distributorData.tmp_user = tmp_user;
            distributorData.user_id = null;
            distributorData.login_user_id = login_user_id;
            distributorData.password = generatePassword();
        } else {
            // No valid input
            return res.status(400).json({ success: false, message: 'Please select a user or provide a temporary user.' });
        }

        await GiftDistributor.create(distributorData);
        // Redirect to distributor list after successful creation
        return res.redirect('/gifts/distributor');
    } catch (error) {
        console.error('Error creating distributor:', error);
        return res.status(500).json({ success: false, message: 'Failed to create distributor', error: error.message });
    }
};

const renderDistributorList = async (req, res) => {
    try {
        const distributors = await GiftDistributor.findAll({
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['name', 'user_id']
            }]
        });

        // const users = await User.findAll({
        //     where: {status: 'Active'},
        //     attributes: ['id', 'user_id', 'name', 'user_type'],
        //     order: [['name', 'ASC']]
        // });

        const delete_probation_id = await GiftReceived.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('distributor_id')), 'distributor_id']
            ],
            raw: true
        }).then(results => results.map(item => item.distributor_id));

        //console.log(delete_probation_id);

        res.render('gifts/distributor', {
            distributors,
            delete_probation_id,
            user: req.session.user,
            currentPage: 'distributor'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const deleteDistributor = async (req, res) => {
    try {
        const { id } = req.params;
        const distributor = await GiftDistributor.findByPk(id);
        if (!distributor) {
            return res.status(404).json({ success: false, message: 'Distributor not found' });
        }
        await distributor.destroy();
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete distributor', error: error.message });
    }
};

const updateDistributorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const distributor = await GiftDistributor.findByPk(id);
        if (!distributor) {
            return res.status(404).json({ success: false, message: 'Distributor not found' });
        }
        distributor.status = status;
        await distributor.save();
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
};


const createReceived = async (req, res) =>{

}



const renderReceivedList = async (req, res) => {
    try {
        // Get parameters from query instead of body
        const page = req.query.page || 1;
        const page_size = req.query.page_size || 10;
        const distributor_id = req.query.distributor_id;
        
        // Validate distributor_id
        if (!distributor_id) {
            return res.status(400).json({
                success: false,
                message: 'distributor_id is required'
            });
        }
        
        // Calculate offset for pagination
        const offset = (page - 1) * page_size;
        
        // Find all gift received records with pagination where distributor_id matches
        const { count, rows } = await GiftReceived.findAndCountAll({
            where: {
                distributor_id: parseInt(distributor_id)
            },
            limit: parseInt(page_size),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });
        
        // Get detailed information for each gift received record
        const giftReceivedList = await Promise.all(rows.map(async (record) => {
            // Get user details
            const user = await User.findByPk(record.user_id, {
                attributes: ['id', 'name', 'user_id']
            });
            
            // Get gift details
            const gift = await Gift.findByPk(record.gift_id, {
                attributes: ['id', 'name']
            });
            
            
            let distributorName = null;
            // Get distributor details
            const distributor = await GiftDistributor.findByPk(record.distributor_id, {
                attributes: ['id', 'user_id', 'tmp_user']
            });

            distributorName = distributor ? distributor.tmp_user : null;
            
            // Get distributor's user details            
            if (distributor && distributor.user_id && distributor.user_id !== null) {
                const distributorUser = await User.findByPk(distributor.user_id, {
                    attributes: ['name','user_id']
                });
                distributorName = distributorUser ? distributorUser.name+' ('+distributorUser.user_id+')' : null;
            }
            
            return {
                id: record.id,
                user: user ? {
                    id: user.id,
                    name: user.name,
                    user_id: user.user_id
                } : null,
                gift: gift ? {
                    id: gift.id,
                    name: gift.name
                } : null,
                distributor: {
                    id: distributor ? distributor.id : null,
                    name: distributorName
                },
                quantity: record.quantity,
                created_at: record.created_at,
                updated_at: record.updated_at
            };
        }));
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(count / page_size);
        
        // Update response format to match frontend expectations
        return res.status(200).json({
            success: true,
            message: 'Gift received list retrieved successfully',
            data: giftReceivedList,
            total_pages: totalPages,
            page: parseInt(page),
            page_size: parseInt(page_size),
            total: count
        });
    } catch (error) {
        console.error('Error in renderReceivedList:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve gift received list',
            error: error.message
        });
    }
};



const distributorLogin = async (req, res) => {
    try {
        const { login_user_id, password } = req.body;
        
        const distributor = await GiftDistributor.findOne({
            where: { 
                login_user_id,
                password,
                status: 'Active'
            }
        });
        
        if (!distributor) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        // req.session.distributor = distributor;
        // Generate JWT token
        const token = jwt.sign(
            {
                id: distributor.id,
                login_user_id: distributor.login_user_id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_DISTRIBUTOR_EXPIRATION }
        );

        return res.json({ success: true, token:token,user:distributor });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to login', error: error.message });
    }
};

const memberGiftList = async (req, res) => {
    try {
        const gifts = await Gift.findAll({
            where: { status: 'Active', quantity: { [Op.gt]: 0 } },
            attributes: ['id', 'name']
        });

        const users = await User.findAll({
            where: { status: 'Active', user_type: 'Member' },
            attributes: ['id', 'user_id', 'name']
        });
        
        res.status(200).json({
            success: true,
            gifts: gifts,
            users: users
        });
    } catch (error) {
        console.error('Error fetching member gift list:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch member gift list',
            error: error.message
        });
    }
};

const distribute = async (req, res) => {
    try {
        const { user_id, gift_id, distributor_id,quantity } = req.body;
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const gift = await Gift.findByPk(gift_id);
        if (!gift) {
            return res.status(404).json({ success: false, message: 'Gift not found' });
        }
        await GiftReceived.create({
            user_id: user_id,
            gift_id: gift_id,
            distributor_id: distributor_id,
            quantity:quantity
        });
        await Gift.update({ quantity: gift.quantity - quantity }, { where: { id: gift_id } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to distribute gift', error: error.message });
    }
};

const adminReceivedList = async (req, res) => {
    try {
        const whereClause = {};
        if (req.query.distributor_id && req.query.distributor_id !== 'all') {
            const distributorId = parseInt(req.query.distributor_id);
            if (!isNaN(distributorId)) {
                whereClause.distributor_id = distributorId;
            }
        }
        
        if (req.query.user_id && req.query.user_id !== 'all') {
            const userId = parseInt(req.query.user_id);
            if (!isNaN(userId)) {
                whereClause.user_id = userId;
            }
        }

        // Get all distributors for the dropdown
        const distributors = await GiftDistributor.findAll({
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['name', 'user_id']
            }]
        });

        // Get all active users for the dropdown
        const users = await User.findAll({
            where: {status: 'Active', user_type: 'member'},
            attributes: ['id', 'user_id', 'name', 'user_type'],
            order: [['name', 'ASC']]
        });

        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        // Build where clause based on filters
        
        if (req.query.distributor_id && req.query.distributor_id !== 'all') {
            whereClause.distributor_id = parseInt(req.query.distributor_id);
        }
        
        if (req.query.user_id && req.query.user_id !== 'all') {
            user_id = parseInt(req.query.user_id);
            const getUser = await User.findOne({ where: { user_id } });
            if (getUser) {
                whereClause.user_id = getUser.id;
            }
        }
        
        // Find all gift received records with pagination and filters
        const { count, rows } = await GiftReceived.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: [['created_at', 'DESC']]
        });
        
        // Get detailed information for each gift received record
        const giftReceivedList = await Promise.all(rows.map(async (record) => {
            // Get user details
            const user = await User.findByPk(record.user_id, {
                attributes: ['id', 'name', 'user_id']
            });
            
            // Get gift details
            const gift = await Gift.findByPk(record.gift_id, {
                attributes: ['id', 'name']
            });
            
            let distributorName = null;
            // Get distributor details
            const distributor = await GiftDistributor.findByPk(record.distributor_id, {
                attributes: ['id', 'user_id', 'tmp_user']
            });

            distributorName = distributor ? distributor.tmp_user : null;
            
            // Get distributor's user details            
            if (distributor && distributor.user_id && distributor.user_id !== null) {
                const distributorUser = await User.findByPk(distributor.user_id, {
                    attributes: ['name','user_id']
                });
                distributorName = distributorUser ? distributorUser.name+' ('+distributorUser.user_id+')' : null;
            }
            
            return {
                id: record.id,
                user: user ? {
                    id: user.id,
                    name: user.name,
                    user_id: user.user_id
                } : null,
                gift: gift ? {
                    id: gift.id,
                    name: gift.name
                } : null,
                distributor: {
                    id: distributor ? distributor.id : null,
                    name: distributorName
                },
                quantity: record.quantity,
                created_at: record.created_at,
                updated_at: record.updated_at
            };
        }));
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(count / limit);
        
        // Render the received.ejs template with all necessary data
        res.render('gifts/received', {
            distributors,
            users,
            user: req.session.user,
            currentPage: 'received',
            giftReceivedList,
            pagination: {
                totalPages,
                currentPage: page,
                totalItems: count
            },
            filters: {
                distributor_id: req.query.distributor_id || 'all',
                user_id: req.query.user_id || ''
            }
        });

    } catch (error) {
        console.error('Error in adminReceivedList:', error);
        res.status(500).render('error', { 
            message: 'Failed to load received gifts list',
            error: error
        });
    }
};


const memberGiftStatus = async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const userdata = await User.findOne({
            where: { user_id, user_type: 'member' },
            attributes: ['id', 'user_id', 'name', 'status']
        });


        if (!userdata) {
            return res.status(400).json({
                success: false,
                message: 'User not found.'
            });
        }

        const user = await GiftReceived.findOne({
            where: { user_id:userdata.id }
        });

        if (user) {
            return res.status(401).json({
                success: false,
                message: 'You have already received gift.'
            });
        }else{
            if(userdata.status !== 'Active') {
                return res.status(401).json({
                    success: false,
                    message: 'User is not active.'
                });
            }else{
                return res.status(200).json({
                    success: true,
                    user: userdata
                });
        }
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}


module.exports = {
    createGift,
    getGift,
    updateGift,
    deleteGift,
    listGifts,
    renderGiftList,
    renderAddGift,
    renderEditGift,
    renderDistributorList,
    createDistributor,
    updateDistributorStatus,
    deleteDistributor,
    renderReceivedList,
    createReceived,
    distributorLogin,
    memberGiftList,
    distribute,
    adminReceivedList,
    memberGiftStatus
};
