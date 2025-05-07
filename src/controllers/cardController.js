const { Card, User, UserTransaction, UserPaymentRequest, AdminTransaction, GeneralSetting } = require("../models");
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { currencyUnit, formatCurrency, formatamount } = require('../utils/currencyFormatter');

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
        // Find the card
        const card = await Card.findOne({
            where: {
                user_id: req.query.user_id
            }
        });

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        // Get transactions for this user with payment request details when available
        const transactions = await UserTransaction.findAll({
            where: {
                user_id: req.query.user_id
            },
            include: [
                {
                    model: UserPaymentRequest,
                    as: 'paymentRequest',
                    required: false,
                    attributes: ['payment_method', 'transaction_id']
                }
            ],
            order: [['id', 'DESC']]
        });

        // Return both card and transactions
        return res.status(200).json({
            card,
            transactions
        });
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

        if (req.query.expiryMonth) {
            whereClause.expiry_month = parseInt(req.query.expiryMonth);
        }

        if (req.query.expiryYear) {
            whereClause.expiry_year = parseInt(req.query.expiryYear);
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
            currencyUnit,
            formatCurrency,
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
        const { id, card_number, cvv_code, expiry_month, expiry_year, card_limit } = req.body;

        // Find the card
        const card = await Card.findOne({ where: { id } });

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        // Prepare update data
        const assigned_date = new Date();
        const status = 'Approved';

        // Update the card
        await card.update({
            card_number,
            cvv_code,
            expiry_month,
            expiry_year,
            assigned_date,
            card_limit,
            current_balance: card_limit,
            status
        });

        // Create a new transaction with the updated model structure
        await UserTransaction.create({
            user_id: card.user_id,
            card_id: card.id,
            payment_category: 'Card',
            comment: 'Card Limit Added',
            type: 'Deposit',
            added: parseFloat(card_limit),
            balance: parseFloat(card_limit),
            status: 'Closed'
        });

        return res.status(200).json({
            success: true,
            message: 'Card updated successfully'
        });
    } catch (error) {
        console.error('Error updating card:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update card',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
        });
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
        const oldCardNumber = card.card_number;
        const oldExpiryMonth = card.expiry_month;
        const oldExpiryYear = card.expiry_year;
        // Update the card details
        await card.update({
            card_number,
            expiry_month,
            expiry_year,
            status
        });

        // Convert both values to numbers for proper comparison
        const numCardLimit = formatamount(card_limit);
        const numOldCardLimit = formatamount(oldCardLimit);

        // Update the transaction details
        if (numCardLimit !== numOldCardLimit) {
            let balance;
            balance = numCardLimit - numOldCardLimit;

            // let type;
            // if(numCardLimit > numOldCardLimit){
            //     balance = numCardLimit - numOldCardLimit;
            //     type = 'credit';
            // }else{
            //     balance = numOldCardLimit - numCardLimit;
            //     type = 'debit';
            // }

            let new_card_limit = formatamount(card.card_limit) + formatamount(balance);
            let new_current_balance = formatamount(card.current_balance) + formatamount(balance);

            await card.update({
                card_limit: new_card_limit,
                current_balance: new_current_balance,
            });

            //always create new transaction
            await UserTransaction.create({
                user_id: card.user_id,
                card_id: card.id,
                payment_category: 'Card',
                comment: 'Card Limit Updated',
                type: 'Deposit',
                added: balance,
                balance: new_current_balance,
                status: 'Closed'
            });

        } else {
            console.log("Card limit not changed");
        }
        
        //Card renevual charge
        if(expiry_year !== oldExpiryYear || expiry_month !== oldExpiryMonth){
            
            // Begin transaction to ensure data consistency
            const t = await sequelize.transaction();

            try {                
                const adminFee = formatamount(process.env.CREATE_CARD_ANNUAL_FEE || 100);

                // Get the latest admin transaction to calculate the new balance
                const latestAdminTransaction = await AdminTransaction.findOne({
                    order: [['id', 'DESC']]
                }, { transaction: t });

                // Calculate new admin balance
                let adminBalance = adminFee;
                if (latestAdminTransaction) {
                    adminBalance = formatamount(latestAdminTransaction.balance) + formatamount(adminFee);
                }

                // Create admin transaction entry
                await AdminTransaction.create({
                    user_id: card.user_id,
                    type: 'Deposit',
                    comment: 'Credit Card Renewal Charge',
                    added: adminFee,
                    balance: adminBalance
                }, { transaction: t });

                const newBalance = formatamount(card.current_balance) - formatamount(adminFee);

                // Create user transaction for the requested amount
                await UserTransaction.create({
                    user_id: card.user_id,
                    card_id: card.id,
                    payment_category: 'Card_Renewal',
                    comment: 'Card Renewal Charge',
                    type: 'Withdrawal',
                    added: 0,
                    used: adminFee,
                    balance: newBalance,
                    status: 'Closed'
                }, { transaction: t });

                // Update card with new balance
                await card.update({
                    current_balance: newBalance,
                }, { transaction: t });

                // Commit the transaction
                await t.commit();

            } catch (error) {
                // If any error occurs, rollback the transaction
                await t.rollback();
                throw error;
            }

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
        const whereClause = {};

        if (req.query.user_id) {
            whereClause['$user.user_id$'] = { [Op.like]: `%${req.query.user_id}%` };
        }

        console.log('Fetching transactions with whereClause:', whereClause);

        // Get transactions with pagination
        const { count, rows } = await UserTransaction.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id']
                }
            ],
            order: [['created_date', 'DESC'], ['id', 'DESC']],
            limit,
            offset
        });

        console.log(`Found ${count} transactions`);

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        // Get current user details if session exists
        let userDetails = null;
        if (req.session && req.session.user) {
            userDetails = await User.findOne({
                where: { id: req.session.user.id },
                attributes: ['id', 'name', 'user_id', 'user_type', 'status']
            });
        }

        // Render the transactions list page
        res.render('cards/transactions', {
            transactions: rows, // Explicitly name the variable to match the template
            user: userDetails,
            currentPage: 'transactions',
            query: req.query,
            currencyUnit,
            formatCurrency,
            pagination: {
                currentPage: page,
                totalPages,
                totalTransactions: count
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
 * Create a new use request
 */
const createUseRequest = async (req, res) => {
    try {
        const { user_id, card_id, amount, reason } = req.body;

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
            card_id: card_id,
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
            // Get card details of the requested user
            const card = await Card.findOne({
                where: { user_id: request.user_id }
            });

            // Validate card before processing
            if (!card) {
                return res.status(400).json({
                    success: false,
                    message: 'Card not found for this user'
                });
            }

            // Check if card is approved
            if (card.status !== 'Approved') {
                return res.status(400).json({
                    success: false,
                    message: 'Card is not approved'
                });
            }

            // Check card expiry (not beyond current date)
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
            const currentYear = currentDate.getFullYear();

            if (card.expiry_year < currentYear ||
                (card.expiry_year === currentYear && card.expiry_month < currentMonth)) {
                return res.status(400).json({
                    success: false,
                    message: 'Card has expired'
                });
            }

            // Check if requested amount is less than or equal to current_balance
            const requestedAmount = formatamount(request.amount);
            const currentBalance = formatamount(card.current_balance || 0);

            if (requestedAmount > currentBalance) {
                return res.status(400).json({
                    success: false,
                    message: 'Requested amount exceeds card balance'
                });
            }

            // Check if it's the first transaction
            const isFirstTransaction = card.first_tx === 0;

            // Admin fee for first transaction
            const adminFee = isFirstTransaction ? formatamount(process.env.CREATE_CARD_FIRST_TRANSACTION_FEE || 100) : 0; // Get fee from env or default to 100

            // Calculate new balance after deduction
            const newBalance = formatamount(currentBalance) - formatamount(requestedAmount);

            // Begin transaction to ensure data consistency
            const t = await sequelize.transaction();

            try {
                // If it's first transaction, create admin transaction
                if (isFirstTransaction) {
                    // Create user transaction record for admin fee
                    const userTransaction = await UserTransaction.create({
                        user_id: request.user_id,
                        card_id: card.id,
                        payment_category: 'Card_Use_Request',
                        comment: 'Admin fee for first card transaction',
                        type: 'Withdrawal',
                        added: 0,
                        used: adminFee,
                        balance: formatamount(currentBalance) - formatamount(adminFee),
                        status: 'Closed',
                    }, { transaction: t });

                    // Get the latest admin transaction to calculate the new balance
                    const latestAdminTransaction = await AdminTransaction.findOne({
                        order: [['id', 'DESC']]
                    }, { transaction: t });

                    // Calculate new admin balance
                    let adminBalance = adminFee;
                    if (latestAdminTransaction) {
                        adminBalance = formatamount(latestAdminTransaction.balance) + formatamount(adminFee);
                    }

                    // Create admin transaction entry
                    await AdminTransaction.create({
                        user_id: request.user_id,
                        request_id: request.id,
                        transaction_id: userTransaction.id,
                        type: 'Deposit',
                        comment: 'First credit card transaction fee',
                        added: adminFee,
                        balance: adminBalance
                    }, { transaction: t });
                }

                // Create user transaction for the requested amount
                await UserTransaction.create({
                    user_payable_request_id: request.id,
                    user_id: request.user_id,
                    card_id: card.id,
                    payment_category: 'Card_Use_Request',
                    comment: request.reason || 'Card use request',
                    type: 'Withdrawal',
                    added: 0,
                    used: requestedAmount - adminFee,
                    balance: newBalance,
                    status: 'Active'
                }, { transaction: t });

                // Update card with new balance and first_tx flag
                await card.update({
                    current_balance: newBalance,
                    first_tx: 1 // Mark as not first transaction anymore
                }, { transaction: t });

                // Commit the transaction
                await t.commit();

            } catch (error) {
                // If any error occurs, rollback the transaction
                await t.rollback();
                throw error;
            }
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

const createPayableRequest = async (req, res) => {
    try {
        const { user_id, card_id, amount, payment_method, transaction_id, payment_date, remarks } = req.body;

        // Find the user
        const user = await User.findOne({ where: { user_id } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create a new payable request
        await UserPaymentRequest.create({
            user_id: user.id,
            card_id: card_id,
            amount: formatamount(amount),
            payment_method,
            transaction_id,
            payment_date: payment_date ? new Date(payment_date) : null,
            reason: remarks, // Use remarks as reason
            request_type: 'payable',
            status: 'Pending'
        });

        return res.status(200).json({
            success: true,
            message: 'Payable request created successfully'
        });
    } catch (error) {
        console.error('Error creating payable request:', error);
        return res.status(500).json({ error: error.message });
    }
};

const updatePayableRequest = async (req, res) => {
    try {
        const { id, status } = req.body;

        // Find the payable request
        const request = await UserPaymentRequest.findOne({ where: { id } });

        if (!request) {
            return res.status(404).json({ error: 'Payable request not found' });
        }

        const amount = request.amount;
        const payable = await caluclateusertransactions(request.user_id, request.created_at);

        console.log(payable);
        if(amount > 0){
            // Begin transaction to ensure data consistency
            const t = await sequelize.transaction();
            
            try {
                // Get the card for this user
                const card = await Card.findOne({
                    where: { user_id: request.user_id },
                    transaction: t
                });
                
                if (!card) {
                    await t.rollback();
                    return res.status(404).json({ error: 'Card not found for this user' });
                }
                
                console.log("amount",amount);
                console.log("card.remaining_amount",card.remaining_amount);

                let remainingAmountToProcess = formatamount(amount) + formatamount(card.remaining_amount);
                
                remainingAmountToProcess = formatamount(remainingAmountToProcess);
                
                console.log("remainingAmountToProcess=",remainingAmountToProcess);
                // Process each transaction
                for (const transaction of payable.transactions) {
                    // Check if we still have remaining amount to process
                    if (remainingAmountToProcess <= 0) break;
                    
                    const transactionNetAmount = formatamount(transaction.used_net_amount);
                    
                    console.log("transactionNetAmount",transactionNetAmount);
                    // Check if we can process this transaction
                    if (remainingAmountToProcess >= transactionNetAmount) {
                        
                        console.log("remainingAmountToProcess>=transactionNetAmount");

                        // Get the latest admin transaction to calculate the new balance
                        const latestAdminTransaction = await AdminTransaction.findOne({
                            order: [['id', 'DESC']],
                            transaction: t
                        });
                        
                        // Calculate new admin balance
                        let adminBalance = formatamount(transaction.used_interest);
                        if (latestAdminTransaction) {
                            adminBalance += formatamount(latestAdminTransaction.balance || 0);
                        }
                        
                        // Insert new entry in adminTransaction for interest
                        await AdminTransaction.create({
                            user_id: request.user_id,
                            request_id: request.id,
                            transaction_id: transaction.id,
                            type: 'Deposit',
                            comment: 'Credit card interest amount',
                            added: formatamount(transaction.used_interest),
                            balance: formatamount(adminBalance)
                        }, { transaction: t });
                        
                        // Calculate new card balance
                        const usedAmount = formatamount(transaction.used_amount);
                        const updateBalance = formatamount(card.current_balance) + formatamount(usedAmount);
                        const depositAmount = formatamount(transaction.used_interest) + formatamount(transaction.used_amount);
                        
                        // Insert new entry in userTransaction
                        await UserTransaction.create({
                            user_payable_request_id: request.id,
                            user_id: request.user_id,
                            card_id: card.id,
                            payment_category: 'Card_Payable_Request',
                            comment: 'Payment by customer',
                            type: 'Deposit',
                            added: usedAmount,
                            balance: updateBalance,
                            status: 'Closed',
                            deposit: depositAmount
                        }, { transaction: t });
                        
                        // Update the transaction status
                        await UserTransaction.update(
                            { status: 'Closed' },
                            { 
                                where: { id: transaction.id },
                                transaction: t 
                            }
                        );
                        
                        // Update card current_balance
                        await card.update(
                            { current_balance: updateBalance },
                            { transaction: t }
                        );
                        
                        // Decrease remaining amount
                        remainingAmountToProcess -= formatamount(transaction.used_net_amount);
                    
                    }else{
                        //Need work;
                    }
                }
                

                // Update the card with the new remaining amount
                await card.update(
                    { remaining_amount: formatamount(remainingAmountToProcess) },
                    { transaction: t }
                );
                    
                                
                // Update the request with new remaining amount
                await request.update(
                    { 
                        status: remainingAmountToProcess <= 0 ? 'Approved' : status 
                    },
                    { transaction: t }
                );
                
                // Commit the transaction
                await t.commit();
                
            } catch (error) {
                // If any error occurs, rollback the transaction
                await t.rollback();
                console.error('Error processing payable request:', error);
                return res.status(500).json({ error: error.message });
            }
        } else {
            // Update the status if no remaining amount
            await request.update({ status });
        }

        return res.status(200).json({ success: true, message: 'Payable request status updated successfully' });
    } catch (error) {
        console.error('Error updating payable request:', error);
        return res.status(500).json({ error: error.message });
    }
};

const calculatePayableRequest = async (req, res) => {
    try {
        const user_id = req.query.user_id;
        
        // Find the user
        const user = await User.findOne({ where: { user_id } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const payable = await caluclateusertransactions(user.id);

        return res.status(200).json({
            success: true,
            payable: payable
        });
    } catch (error) {
        console.error('Error fetching payable requests:', error);
        return res.status(500).json({ error: error.message });
    }
};


const caluclateusertransactions = async (user_id, to_date = null) => {
    // Get interest rate from general settings
    const generalSetting = await GeneralSetting.findOne();
    let dailyInterestRate = generalSetting ? (generalSetting.credit_card_loan / 365) : process.env.CREATE_CARD_LOAN_INTEREST_RATE; 
    dailyInterestRate = formatamount(dailyInterestRate);
    
    //console.log('dailyInterestRate=',dailyInterestRate);
    
    // Get all active Card_Use_Request transactions for the user
    const transactions = await UserTransaction.findAll({
        where: {
            payment_category: 'Card_Use_Request',
            user_id: user_id,
            status: 'Active',
            used: { [Op.gt]: 0 } // Only include transactions with used amount > 0
        },
        order: [['created_date', 'ASC']]
    });

    // Calculate interest for each transaction
    let total_amount = 0;
    let total_interest = 0;
    const todate = to_date || new Date(); // Use provided to_date or today's date
    const currentDate = new Date(); // Current date for calculate_date field

    // Process each transaction and update the database
    const transactionDetails = [];
    for (const transaction of transactions) {
        const used_amount = formatamount(transaction.used || 0);
        const from_date = new Date(transaction.created_date);

        // Calculate days difference (excluding the same day)
        const diffTime = Math.abs(todate - from_date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log('diffDays=',diffDays,'dailyInterestRate=',dailyInterestRate," from_date=",from_date, "todate=", todate);
        
        // Calculate interest
        // const interest = (used_amount * dailyInterestRate * diffDays).toFixed(2);
        
        let interest = ((used_amount*dailyInterestRate)/100)*diffDays;
        interest = formatamount(interest);
        console.log('used_amount=',used_amount,'    interest=',interest);
        
        //console.log('interest=',interest);
        
        // const parsedInterest = formatamount(interest);
        const used_net_amount = used_amount + interest;
        
        // Add to totals
        total_amount =formatamount(total_amount) + formatamount(used_amount);
        total_interest =formatamount(total_interest) + formatamount(interest);
        
        // Update transaction record in database
        await transaction.update({
            used_interest: interest,
            used_net_amount: used_net_amount,
            days: diffDays,
            interest_rate: dailyInterestRate,
            calculate_date: currentDate
        });
        
        // Add to transaction details array
        transactionDetails.push({
            id: transaction.id,
            created_date: transaction.created_date,
            days: diffDays,
            used_amount: used_amount,
            used_interest: interest,
            used_net_amount: used_net_amount,
            interest_rate: dailyInterestRate,
            calculate_date: currentDate
        });
    }

    //get remaining amount
    const card = await Card.findOne({ where: { user_id } });
    const remaining_amount = card?.remaining_amount || 0;
    
    // Convert string values to numbers before calculation
    let total_net_amount = (formatamount(total_amount) + formatamount(total_interest)) - formatamount(remaining_amount);
    
    //console.log('total_net_amount=',total_net_amount);
    
    //total_net_amount = formatamount(total_net_amount);
    
    return {
        transactions: transactionDetails,
        total_amount: total_amount,
        total_interest: total_interest,
        remaining_amount: remaining_amount,
        total_net_amount: total_net_amount       
    };
}

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
    createPayableRequest,
    updatePayableRequest,
    calculatePayableRequest
};