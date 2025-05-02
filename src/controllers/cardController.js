const { Card, User, UserTransaction, UserPaymentRequest, AdminTransaction, GeneralSetting } = require("../models");
const sequelize = require('../config/database');
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
        // Find the card for the user
        const card = await Card.findOne({
            where: {
                user_id: req.query.user_id
            }
        });

        // Get current month's date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        let use_requests = [];
        let transactions = [];

        if (card) {
            // Find the user by user_id
            const user = await User.findOne({
                where: { id: req.query.user_id }
            });
            
            if (user) {
                //console.log("date in getDetails=", startOfMonth, endOfMonth);
                // Get current month's payment requests for this user
                // const { rows: use_requests_list } = await UserPaymentRequest.findAndCountAll({
                //     where: {
                //         user_id: user.id,
                //         // created_date: {
                //         //     [Op.between]: [startOfMonth, endOfMonth]
                //         // }
                //     },
                //     include: [
                //         {
                //             model: User,
                //             as: 'user',
                //             attributes: ['id', 'name', 'user_id', 'account_number']
                //         }
                //     ],
                //     order: [['created_date', 'DESC']]
                // });

                // use_requests = use_requests_list;

                // Get current month's transactions for this user
                const { rows: transactions_list } = await UserTransaction.findAndCountAll({
                    where: {
                        user_id: user.id,
                        // created_date: {
                        //     [Op.between]: [startOfMonth, endOfMonth]
                        // }
                    },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'user_id', 'account_number']
                        }
                    ],
                    order: [['id', 'DESC']]
                });

                // Store the transactions list
                transactions = transactions_list;
                
            }
        }
            
        // Return card, payment requests, and transactions
        return res.status(200).json({
            card: card,
            transactions: transactions
        });

    } catch (error) {
        console.error('Error in getDetails:', error);
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
        const { id, card_number, cvv_code, expiry_month, expiry_year, card_limit } = req.body;
        const card = await Card.findOne({ where: { id } });
        
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }
        
        
        
        // Create a new transaction entry or update existing one
        const usertransaction = await UserTransaction.findOne({ 
            where: { user_id: card.user_id },
            order: [['id', 'DESC']]
        });
        
        if (!usertransaction) {
            console.log("usertransaction not found");
            // Get the current date for assigned_date
            const assigned_date = new Date();
            const status = 'Approved';
            
            // First, update the card with the new information
            // Set current_balance to card_limit if it's a new card
            const current_balance = card_limit;
            
            await card.update({ 
                card_number,
                cvv_code,
                expiry_month,
                expiry_year,
                assigned_date,
                card_limit,
                current_balance,
                status 
            });
            console.log("card updated");
            
            // Create a new transaction if none exists
            await UserTransaction.create({
                user_id: card.user_id,
                payment_category: 'Card',
                comment: 'Added Card Limit',
                type: 'Deposit',
                added: card_limit,
                balance: current_balance,
                status: 'Closed'
            });
            console.log("usertransaction created");

            return res.status(200).json({ message: 'Card updated successfully' });

        } else {            
            // Calculate new balance
            const balance = parseFloat(usertransaction.balance || 0) + parseFloat(card_limit);
            //console.log("else usertransaction created");
            
            // Create a new transaction record (don't update existing one)
            await UserTransaction.create({
                user_id: card.user_id,
                payment_category: 'Card',
                name: 'Card Limit',
                type: 'Deposit',
                added: card_limit,
                balance: balance,
                status: 'Closed'
            }); 
            console.log("else usertransaction created");
            
            // Also update the card's current balance
            await card.update({ 
                card_number:card_number.card_number,
                cvv_code:card_number.cvv_code,
                expiry_month:card_number.expiry_month,
                expiry_year:card_number.expiry_year,
                assigned_date:card_number.assigned_date,
                card_limit:card_number.card_limit,
                current_balance: balance,
                status:card_number.status 
            });
            console.log("else card updated");

            return res.status(200).json({ message: 'Card updated successfully' });
        }         
        
    } catch (error) {
        console.error('Error updating card:', error);
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
        
        
        // console.log("card_limit", card_limit, typeof card_limit);
        // console.log("oldCardLimit", oldCardLimit, typeof oldCardLimit);
        
        // Convert both values to numbers for proper comparison
        const numCardLimit = parseFloat(card_limit);
        const numOldCardLimit = parseFloat(oldCardLimit);
        // console.log("After conversion - numCardLimit:", numCardLimit, typeof numCardLimit);
        // console.log("After conversion - numOldCardLimit:", numOldCardLimit, typeof numOldCardLimit);
        

        // Update the card details
        await card.update({ 
            current_balance:numCardLimit,
            card_limit:numCardLimit,
        });
        
        // Update the transaction details
        if(numCardLimit !== numOldCardLimit){
            let balance;
            let type;
            // if(numCardLimit > numOldCardLimit){
            //     balance = numCardLimit - numOldCardLimit;
            //     type = 'credit';
            // }else{
            //     balance = numOldCardLimit - numCardLimit;
            //     type = 'debit';
            // }

            type = "Deposit";
            balance = numCardLimit - numOldCardLimit;

            // Get the latest transaction record for the user
            const usertransaction = await UserTransaction.findOne({ 
                where: { user_id: card.user_id },
                order: [['id', 'DESC']] // Order by ID descending to get the latest record
            });
            if(usertransaction){
                //let txn_balance;
                // if(type === 'credit'){
                //     txn_balance = usertransaction.balance + balance;
                // }else{
                //     txn_balance = usertransaction.balance - balance;
                // }

                //txn_balance = usertransaction.balance + (balance);

                //always create new transaction
                await UserTransaction.create({
                    user_id: card.user_id,
                    payment_category: 'Card',
                    name: 'Card Limit',
                    type: type,
                    added: balance,
                    balance: numCardLimit,
                    status: 'Closed'
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

        // Build filter conditions for transactions
        const whereClause = {
            payment_category: {
                [Op.in]: ['Card', 'Card_Use_Request', 'Card_Payment_Request'] // Show all card-related transactions
            }
        };

        // If user_id is provided, filter by that user
        if (req.query.user_id) {
            // First find the user by user_id
            const user = await User.findOne({
                where: { user_id: req.query.user_id }
            });
            
            if (user) {
                whereClause.user_id = user.id;
            }
        }

        // Get transactions with pagination
        const { count, rows: transactions } = await UserTransaction.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id', 'account_number']
                }
            ],
            order: [['id', 'DESC']],
            limit,
            offset
        });

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        console.log('Found transactions:', transactions.length);
        
        // Render the transactions page
        return res.render('cards/transactions', {
            transactions: transactions,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'transactions',
            query: req.query,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const addPaymentRequest = async (req, res) => {
    try {
        const { user_id, amount, reason } = req.body;
        //console.log("user_id", user_id, "amount", amount, "reason", reason);
        // Check if user exists with status 'active' and 'approved'
        const user = await User.findOne({
            where: {
                id: user_id,
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
        const card = await UserPaymentRequest.create({
            user_id: user.id,
            payment_category: 'Card_Use_Request',
            comment: reason,
            amount: parseFloat(amount),
            status: 'Pending'
        });

        return res.status(201).json({ message: 'Your request was successfully added.' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const addUseRequest = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Build filter conditions for transactions
        const whereClause = {
            payment_category: 'Card_Use_Request' // Only show card-related transactions
        };

        // If user_id is provided, filter by that user
        if (req.query.user_id) {
            // First find the user by user_id
            const user = await User.findOne({
                where: { user_id: req.query.user_id }
            });
            
            if (user) {
                whereClause.user_id = user.id;
            }
        }

        // Get transactions with pagination
        const { count, rows: transactions } = await UserPaymentRequest.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id', 'account_number']
                }
            ],
            order: [['created_date', 'DESC']],
            limit,
            offset
        });

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        console.log('Found transactions:', transactions.length);
        
        // Render the transactions page
        return res.render('cards/use_request', {
            transactions: transactions,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'use_request',
            query: req.query,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUseRequest = async (req, res) => {
    try {
        // Get id from URL parameters instead of request body
        const id = req.params.id;
        const { status } = req.body;
        
        //console.log("id from params:", id, "status from body:", status);
        
        const userPaymentRequest = await UserPaymentRequest.findOne({ where: { id } });
        //console.log("userPaymentRequest:", userPaymentRequest);
        
        if (!userPaymentRequest) {
            return res.status(404).json({ error: 'User payment request not found' });
        }

        let amount = userPaymentRequest.amount;
        const card = await Card.findOne({ where: { user_id: userPaymentRequest.user_id, status: 'Approved' } });
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }
        // console.log("card:", card);
        // console.log("first_tx:", card.first_tx);
        // console.log("first_tx type:", typeof card.first_tx);


        if(card.first_tx===1){
            console.log("second Transaction");

            let current_balance = card.current_balance;
            
            current_balance = current_balance - amount;
            
            const userTransaction2 = await UserTransaction.create({
                user_id: userPaymentRequest.user_id,
                payment_category: userPaymentRequest.payment_category,
                comment: userPaymentRequest.comment,
                type: "Withdrawal",
                used: amount,
                balance: current_balance
            });

            //Update card
            card.current_balance = current_balance;
            await card.save();

        }else{
            console.log("first Transaction");
            const admin_amount = 100;
            const used_amount = amount - admin_amount;
            
            let current_balance = card.current_balance;
            
            //First transaction
            current_balance = current_balance - admin_amount;
            
            const userTransaction = await UserTransaction.create({
                user_id: userPaymentRequest.user_id,
                payment_category: userPaymentRequest.payment_category,
                comment: "First Transaction Charge",
                type: "Withdrawal",
                used: admin_amount,
                balance: current_balance,
                status: 'Closed',
            });

            // Find the last admin transaction record
            const adminTransaction = await AdminTransaction.findOne({
                order: [['id', 'DESC']]
            });

            const admin_balance = (adminTransaction?.balance || 0) + admin_amount;

            //First admin transaction
            AdminTransaction.create({
                user_id: userPaymentRequest.user_id,
                request_id: userPaymentRequest.id,
                transaction_id: userTransaction.id,
                type: "Deposit",
                comment: "First Transaction of Credit card",
                added: admin_amount,
                balance: admin_balance            
            });

            //Second transaction
            current_balance = current_balance - used_amount;
            
            const userTransaction2 = await UserTransaction.create({
                user_id: userPaymentRequest.user_id,
                payment_category: userPaymentRequest.payment_category,
                comment: userPaymentRequest.comment,
                type: "Withdrawal",
                used: used_amount,
                balance: current_balance
            });

            //Update card
            card.first_tx = 1;
            card.current_balance = current_balance;
            await card.save();
        }
        
        userPaymentRequest.status = status;
        await userPaymentRequest.save();
        
        return res.status(200).json({ 
            message: 'User payment request updated successfully',
            id: id,
            status: status
        });
    } catch (error) {
        console.error('Error updating payment request:', error);
        return res.status(500).json({ error: error.message });
    }
};


const addPayableRequest = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Build filter conditions for transactions
        const whereClause = {
            payment_category: 'Card_Payment_Request' // Only show card-related transactions
        };

        // If user_id is provided, filter by that user
        if (req.query.user_id) {
            // First find the user by user_id
            const user = await User.findOne({
                where: { user_id: req.query.user_id }
            });
            
            if (user) {
                whereClause.user_id = user.id;
            }
        }

        // Get transactions with pagination
        const { count, rows: transactions } = await UserPaymentRequest.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id', 'account_number']
                }
            ],
            order: [['created_date', 'DESC']],
            limit,
            offset
        });

        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);

        console.log('Found transactions:', transactions.length);
        
        // Render the transactions page
        return res.render('cards/payable_request', {
            transactions: transactions,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'payable_request',
            query: req.query,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const updatePayableRequest = async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        
        console.log("id from params:", id, "status from body:", status);
        
        const userPaymentRequest = await UserPaymentRequest.findOne({ where: { id } });
        
        if (!userPaymentRequest) {
            return res.status(404).json({ error: 'User payment request not found' });
        }

        let amount = userPaymentRequest.amount;
        const card = await Card.findOne({ where: { user_id: userPaymentRequest.user_id, status: 'Approved' } });
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        let payable_amount = await calculatePayable(userPaymentRequest.user_id,userPaymentRequest.created_date);
        
        const transactions = payable_amount?.transactions || [];
        const total_loan_amount = payable_amount?.total_loan_amount || 0;
        const interest = payable_amount?.total_interest || 0;
        const total_payable = payable_amount?.total_payable || 0;
        
        // if(amount<interest){
        //     return res.status(403).json({ error: 'Amount is less than interest' });
        // }       
        
        //Admin transaction
        if(interest>0){
            const adminTransaction = await AdminTransaction.findOne({
                order: [['id', 'DESC']]
            });            
            const admin_balance = (adminTransaction?.balance || 0) + interest;
            var adminTransaction2 = await AdminTransaction.create({
                user_id: userPaymentRequest.user_id,
                request_id: userPaymentRequest.id,
                type: "Deposit",
                comment: "Credit card interest",
                added: interest,
                balance: admin_balance            
            });
        }
        
        //User transaction
        const paid_amount = amount - interest;

        if(paid_amount>0){
            let current_balance = parseFloat(card.current_balance+paid_amount);
            
            const userTransaction = await UserTransaction.create({
                user_id: userPaymentRequest.user_id,
                payment_category: userPaymentRequest.payment_category,
                comment: userPaymentRequest.comment,
                type: "Deposit",
                added: paid_amount,
                balance: current_balance
            });

            card.current_balance = current_balance;
            await card.save();              
            
        }

        userPaymentRequest.status = status;
        await userPaymentRequest.save();
        
        return res.status(200).json({ 
            message: 'User payment request updated successfully',
            id: id,
            status: status
        });
    } catch (error) {
        console.error('Error updating payment request:', error);
        return res.status(500).json({ error: error.message });
    }
};


const calculatePayable = async (user_id,toDate = new Date()) => {
    try {
        console.log("user_id",user_id);

        const generalSetting = await GeneralSetting.findOne();
        const credit_card_loan = generalSetting.credit_card_loan;

        // Get all withdrawal transactions that are active
        const usertransactions = await UserTransaction.findAll({ 
            where: { 
                user_id: user_id,
                status: 'Active',
                type: 'Withdrawal',  
                added: null,    
                payment_category: {
                    [Op.in]: ['Card_Use_Request']
                }
            },
            order: [['created_date', 'DESC']]
        });

        console.log("usertransactions",usertransactions);

        // Calculate totals
        let total_loan_amount = 0;
        let total_interest = 0;
        
        usertransactions.forEach(transaction => {
            let loan_amount = parseFloat(transaction.used || 0);
            const fromDate = new Date(transaction.created_date);
            // Use the toDate parameter directly, not creating a new Date from it
            const diffTime = toDate - fromDate;
            let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            diffDays = diffDays + 1;
            console.log("fromDate=", fromDate, "toDate=", toDate, "diffDays=", diffDays);
            // Calculate interest using daily rate (yearly rate / 365)
            const dailyInterestRate = parseFloat((credit_card_loan) / 365);
            const interest = parseFloat(loan_amount * (dailyInterestRate / 100) * diffDays);
            
            console.log("loan_amount=",loan_amount, "created_date=",transaction.created_date,"diffDays=",diffDays,"daily_rate=",dailyInterestRate,"interest=",interest);

            total_interest += parseFloat(interest);
            total_loan_amount += parseFloat(loan_amount);
        });
        
        // Format numbers to 2 decimal places
        const formatted_loan_amount = parseFloat(total_loan_amount).toFixed(2);
        const formatted_interest = parseFloat(total_interest).toFixed(2);
        const total_payable = parseFloat(total_loan_amount) + parseFloat(total_interest);
        const formatted_payable = parseFloat(total_payable).toFixed(2);
        
        return {
            transactions: usertransactions,
            total_loan_amount: parseFloat(formatted_loan_amount),
            total_interest: parseFloat(formatted_interest),
            total_payable: parseFloat(formatted_payable)
        };
    } catch (error) {
        console.error('Error calculating payable:', error);
        return null;
    }
};

const getPayable = async (req, res) => {
    try {
        const { user_id } = req.query;        
        const today = new Date(); // Get current date
        const payable = await calculatePayable(user_id, today);
        console.log("payable",payable);
        return res.status(200).json({
            success: true,
            message: 'Payable request retrieved successfully',
            payable
        });

    } catch (error) {
        console.error('Error getting payable request:', error);
        return res.status(500).json({ error: error.message });
    }
};

const payPayable = async (req, res) => {
    try {
        const { user_id, card_id, amount } = req.body;
        if(user_id && (amount !== 0 || amount !== null || amount !== undefined)){
            const card = await UserPaymentRequest.create({
                user_id: user_id,
                payment_category: 'Card_Payment_Request',
                comment: 'Payable Request',
                amount: parseFloat(amount),
                status: 'Pending'
            });
            return res.status(200).json({
                success: true,
                message: 'User payable request paid successfully',
            });
        }else{
            return res.status(400).json({ 
                success: false,
                message: 'Amount is required' 
            });
        }
        
    } catch (error) {
        console.error('Error paying payable request:', error);
        return res.status(500).json({ 
            success: false,
            message: error.message 
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
    addPaymentRequest,
    addUseRequest,
    updateUseRequest,
    addPayableRequest,
    updatePayableRequest,
    getPayable,
    payPayable
};