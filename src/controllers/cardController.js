const { Card, User, UserTransaction, UserPaymentRequest } = require("../models");
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
    // console.log("req.query.user_id", req.query.user_id);
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
            //whereClause['$user.user_id$'] = { [Op.like]: `%${req.query.user_id}%` };
            whereClause['$user.user_id$'] = req.query.user_id;
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
            title: 'Cards - Vertex Admin',
            style: '',
            script: '',
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
        
        // Create a new transaction entry
        const usertransaction = await UserTransaction.findOne({ where: { user_id: card.user_id } });
        if(!usertransaction){
            const transaction = await UserTransaction.create({
                user_id: card.user_id,
                payment_category: 'Card',
                name: 'Card Limit',
                type: 'credit',
                amount: card_limit,
                balance: card_limit
            });
        }else{
            await usertransaction.update({
                payment_category: 'Card',
                name: 'Card Limit',
                type: 'credit',
                amount: card_limit,
                balance: usertransaction.balance + card_limit
            });
        } 
        
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

const updateCardDetails = async (req, res) => {
    try {
        const { id, card_number, expiry_month, expiry_year, card_limit, status } = req.body;
        
        // Find the card
        const card = await Card.findOne({ where: { id } });
        
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }
        const oldCardLimit = card.card_limit;
        // Update the card details
        await card.update({ 
            card_number,
            expiry_month,
            expiry_year,
            card_limit,
            status
        });
        
        console.log("card_limit", card_limit, typeof card_limit);
        console.log("oldCardLimit", oldCardLimit, typeof oldCardLimit);
        
        // Convert both values to numbers for proper comparison
        const numCardLimit = parseFloat(card_limit);
        const numOldCardLimit = parseFloat(oldCardLimit);
        console.log("After conversion - numCardLimit:", numCardLimit, typeof numCardLimit);
        console.log("After conversion - numOldCardLimit:", numOldCardLimit, typeof numOldCardLimit);
        
        // Update the transaction details
        if(numCardLimit !== numOldCardLimit){
            let balance;
            let type;
            if(numCardLimit > numOldCardLimit){
                balance = numCardLimit - numOldCardLimit;
                type = 'credit';
            }else{
                balance = numOldCardLimit - numCardLimit;
                type = 'debit';
            }

            // Get the latest transaction record for the user
            const usertransaction = await UserTransaction.findOne({ 
                where: { user_id: card.user_id },
                order: [['id', 'DESC']] // Order by ID descending to get the latest record
            });
            if(usertransaction){
                let txn_balance;
                if(type === 'credit'){
                    txn_balance = usertransaction.balance + balance;
                }else{
                    txn_balance = usertransaction.balance - balance;
                }
                //always create new transaction
                await UserTransaction.create({
                    user_id: card.user_id,
                    payment_category: 'Card',
                    name: 'Card Limit',
                    type: type,
                    amount: balance,
                    balance: txn_balance
                });
            }
        }else{
            console.log("Card limit not changed");

        }
        
        return res.status(200).json({ message: 'Card details updated successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


const getTransactions = async (req, res) => {
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
        res.render('cards/transactions', {
            cards,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'transactions',
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

/**
 * Render the payable request page with list of payable requests
 */
const getPayableRequest = async (req, res) => {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        // Build filter conditions
        const whereClause = {
            request_type: 'payable'
        };
        
        if (req.query.user_id) {
            whereClause['$user.user_id$'] = { [Op.like]: `%${req.query.user_id}%` };
        }
        
        if (req.query.status) {
            whereClause.status = req.query.status;
        }
        
        // Get payable requests with pagination
        const { count, rows: requests } = await UserPaymentRequest.findAndCountAll({
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
        
        // Get current user details
        const userDetails = await User.findOne({
            where: { id: req.session.user.id },
            attributes: ['id', 'name', 'user_id', 'user_type', 'status']
        });

        // Render the payable request page
        res.render('cards/payable_request', {
            title: 'Request for Payable Amount - Vertex Admin',
            currentPage: 'payable_request',
            user: userDetails,
            requests,
            query: req.query,
            pagination: {
                currentPage: page,
                totalPages,
                totalRequests: count
            },
            success: req.query.success || '',
            error: req.query.error || ''
        });
    } catch (error) {
        console.error('Error rendering payable request page:', error);
        res.status(500).render('error', { 
            title: 'Error - Vertex Admin',
            message: 'Error loading payable request page',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading the payable request page.',
            style: '',
            script: '',
            user: null
        });
    }
};

/**
 * Update the payable request status
 */
const updatePayableRequest = async (req, res) => {
    try {
        const { id, status } = req.body;
        
        // Find the request
        const request = await UserPaymentRequest.findOne({ 
            where: { id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id']
                }
            ]
        });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Payment request not found'
            });
        }
        
        // Update the status
        await request.update({ status });
        
        // If approved, update the user's balance
        if (status === 'Approved') {
            // Get the latest transaction for the user
            const latestTransaction = await UserTransaction.findOne({
                where: { user_id: request.user_id },
                order: [['id', 'DESC']]
            });
            
            let currentBalance = 0;
            if (latestTransaction) {
                currentBalance = parseFloat(latestTransaction.balance);
            }
            
            // Create a new transaction
            await UserTransaction.create({
                user_id: request.user_id,
                payment_category: 'Card',
                name: 'Payable Amount',
                type: 'debit',
                amount: parseFloat(request.amount),
                balance: currentBalance - parseFloat(request.amount)
            });
        }
        
        res.json({
            success: true,
            message: `Payable request ${status.toLowerCase()} successfully`
        });
    } catch (error) {
        console.error('Error updating payable request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payable request',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
        });
    }
};

/**
 * Create a new use request
 */
const createUseRequest = async (req, res) => {
    try {
        const { user_id, amount, reason } = req.body;
        
        // Find the user
        const user = await User.findOne({ where: { user_id } });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Create the use request
        await UserPaymentRequest.create({
            user_id: user.id,
            request_type: 'use',
            amount,
            reason,
            status: 'Pending'
        });
        
        res.json({
            success: true,
            message: 'Use request created successfully'
        });
    } catch (error) {
        console.error('Error creating use request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create use request',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
        });
    }
};

/**
 * Render the use request page with list of use requests
 */
const getUseRequest = async (req, res) => {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        // Build filter conditions
        const whereClause = {
            request_type: 'use'
        };
        
        if (req.query.user_id) {
            whereClause['$user.user_id$'] = { [Op.like]: `%${req.query.user_id}%` };
        }
        
        if (req.query.status) {
            whereClause.status = req.query.status;
        }
        
        // Get use requests with pagination
        const { count, rows: requests } = await UserPaymentRequest.findAndCountAll({
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
        
        // Get current user details
        const userDetails = await User.findOne({
            where: { id: req.session.user.id },
            attributes: ['id', 'name', 'user_id', 'user_type', 'status']
        });

        // Render the use request page
        res.render('cards/use_request', {
            title: 'Request for Use Amount - Vertex Admin',
            currentPage: 'use_request',
            user: userDetails,
            requests,
            query: req.query,
            pagination: {
                currentPage: page,
                totalPages,
                totalRequests: count
            },
            success: req.query.success || '',
            error: req.query.error || ''
        });
    } catch (error) {
        console.error('Error rendering use request page:', error);
        res.status(500).render('error', { 
            title: 'Error - Vertex Admin',
            message: 'Error loading use request page',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading the use request page.',
            style: '',
            script: '',
            user: null
        });
    }
};

/**
 * Update the use request status
 */
const updateUseRequest = async (req, res) => {
    try {
        const { id, status } = req.body;
        
        // Find the request
        const request = await UserPaymentRequest.findOne({ 
            where: { id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id']
                }
            ]
        });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Payment request not found'
            });
        }
        
        // Update the status
        await request.update({ status });
        
        // If approved, update the user's balance
        if (status === 'Approved') {
            // Get the latest transaction for the user
            const latestTransaction = await UserTransaction.findOne({
                where: { user_id: request.user_id },
                order: [['id', 'DESC']]
            });
            
            let currentBalance = 0;
            if (latestTransaction) {
                currentBalance = parseFloat(latestTransaction.balance);
            }
            
            // Create a new transaction
            await UserTransaction.create({
                user_id: request.user_id,
                payment_category: 'Card',
                name: 'Use Amount',
                type: 'credit',
                amount: parseFloat(request.amount),
                balance: currentBalance + parseFloat(request.amount)
            });
        }
        
        res.json({
            success: true,
            message: `Use request ${status.toLowerCase()} successfully`
        });
    } catch (error) {
        console.error('Error updating use request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update use request',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
        });
    }
};

module.exports = {
    addCard,
    getDetails,
    getAllCards,
    requestCard,
    updateCard,
    updateCardStatus,
    updateCardDetails,
    getTransactions,
    getUseRequest,
    getPayableRequest,
    createUseRequest,
    updateUseRequest,
    updatePayableRequest
};