const { User, Profile, RecurringDepositSetting, RecurringDeposit, RecurringDepositTransaction, OverdraftDeposit, AdminTransaction } = require('../models');
const sequelize = require('../config/database');
const { Op, Sequelize } = require('sequelize');
const { formatCurrency, formatamount } = require('../utils/currencyFormatter');


// Get Recurring Deposit controller method
const getRecurringDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { setting_id } = req.query;

        // Find the user
        const member = await User.findByPk(id, {
            include: [
                {
                    model: Profile,
                    as: 'profile'
                }
            ]
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Find RD settings for the user
        const settings = await RecurringDepositSetting.findAll({
            where: { user_id: id },
            order: [['created_at', 'DESC']]
        });

        // Find active setting
        let activeSetting = null;
        if (setting_id) {
            // If setting_id is provided, use that
            activeSetting = await RecurringDepositSetting.findOne({
                where: { id: setting_id, user_id: id }
            });
        } else {
            // Otherwise, find the active setting
            activeSetting = await RecurringDepositSetting.findOne({
                where: { user_id: id, is_active: 1 },
                order: [['created_at', 'DESC']]
            });
        }

        // Get deposits for the active setting
        let deposits = [];
        if (activeSetting) {
            deposits = await RecurringDeposit.findAll({
                where: { setting_id: activeSetting.id },
                order: [['deposit_date', 'DESC']]
            });
        }

        // Get the formatCurrency utility
        const { formatCurrency, formatamount } = require('../utils/currencyFormatter');
        
        // Render the view
        res.render('members/recurring-deposit', {
            title: 'Recurring Deposit - Vertex Admin',
            currentPage: 'members',
            user: JSON.stringify(req.session.user, null, 2),
            member,
            deposits,
            formatCurrency: formatCurrency,
            activeSetting,
            allSettings: settings
        });
    } catch (error) {
        console.error('Get recurring deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching recurring deposit data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching data.'
        });
    }
};

// Add Recurring Deposit controller method
const addRecurringDeposit = async (req, res) => {
    // Begin transaction to ensure data consistency
    // const { formatCurrency, formatamount } = require('../utils/currencyFormatter');
    
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { setting_id, per_day_rate, required_amount, payment_interval, amount, payment_method, transaction_id, comments, status, penality_amount, penality_paid_amount } = req.body;
        // console.log(req.body);
        
        // Validate user exists
        const user = await User.findByPk(id, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Member not found' 
            });
        }

        // Create new deposit record
        const deposit = await RecurringDeposit.create({
            user_id: id,
            setting_id: setting_id,
            per_day_rate,
            required_amount,
            payment_interval,
            amount: parseFloat(amount - penality_paid_amount),
            total_amount: parseFloat(amount - penality_paid_amount),            
            payment_method,
            transaction_id,
            comments,
            deposit_date: new Date(),
            penality_amount: penality_amount || 0,
            penality_paid_amount: penality_paid_amount || 0,
            status: status || 'Pending' 
        }, { transaction: t });

        // If penalty amount is greater than 0, create an AdminTransaction entry
        if (penality_paid_amount > 0) {
            // Get the latest admin transaction to calculate the new balance
            const latestAdminTransaction = await AdminTransaction.findOne({
                order: [['id', 'DESC']]
            }, { transaction: t });

            // Calculate new admin balance
            let adminBalance = formatamount(penality_paid_amount);
            if (latestAdminTransaction) {
                adminBalance = formatamount(latestAdminTransaction.balance) + formatamount(penality_paid_amount);
            }

            // Create admin transaction entry for penalty amount
            await AdminTransaction.create({
                user_id: id,
                type: 'Deposit',
                comment: 'RD Penalty amount',
                added: formatamount(penality_paid_amount),
                balance: adminBalance
            }, { transaction: t });
        }

        // Commit the transaction
        await t.commit();

        return res.json({
            success: true,
            message: 'Recurring deposit added successfully',
            deposit
        });
    } catch (error) {
        // If any error occurs, rollback the transaction
        await t.rollback();
        
        console.error('Add recurring deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding recurring deposit',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while adding the deposit.'
        });
    }
};


// Update Recurring Deposit controller method
const updateRecurringDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { per_day_rate, required_amount, payment_interval, amount, payment_method, transaction_id, comments, status, penality_paid_amount, setting_id, total_interest } = req.body;

        // Find the deposit
        const deposit = await RecurringDeposit.findByPk(id);
        
        if (!deposit) {
            return res.status(404).json({ 
                success: false, 
                message: 'Deposit record not found' 
            });
        }

        // Calculate total amount based on required amount and interest
        const totalAmount = parseFloat(required_amount) + parseFloat(total_interest || 0);

        // Update deposit
        await deposit.update({
            per_day_rate,
            required_amount,
            amount: parseFloat(required_amount), // Base amount is the required amount
            total_amount: totalAmount, // Total amount includes interest
            interest_amount: parseFloat(total_interest || 0), // Update interest amount
            payment_interval,
            payment_method,
            transaction_id,
            comments,
            penality_paid_amount,
            status,
            setting_id
        });

        return res.json({
            success: true,
            message: 'Recurring deposit updated successfully',
            deposit
        });
    } catch (error) {
        console.error('Update recurring deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating recurring deposit',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while updating the deposit.'
        });
    }
};

// Calculate Recurring Deposits controller method
const calculateRecurringDeposits = async (req, res) => {
    try {
        const { id } = req.params; // User ID
        const { setting_id } = req.query; // Get setting_id from query params
        
        // Build the where clause based on available parameters
        let whereClause = { user_id: id };
        
        // If setting_id is provided, add it to the where clause
        if (setting_id) {
            whereClause.setting_id = setting_id;
        }
        
        // Find deposits for the user with optional setting filter
        const deposits = await RecurringDeposit.findAll({
            where: whereClause,
            order: [['deposit_date', 'ASC']]
        });
        
        if (!deposits || deposits.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No deposits found for this user'
            });
        }
        // console.log(deposits);
        
        // Perform calculations for each deposit
        for (const deposit of deposits) {
            // Example calculation logic - update as needed
            // Get the deposit date and set it to the first day of the month
            const originalDepositDate = new Date(deposit.deposit_date);
            const depositDate = new Date(originalDepositDate.getFullYear(), originalDepositDate.getMonth(), 1);
            const currentDate = new Date();
            const diffTime = Math.abs(currentDate - depositDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const interestAmount = parseFloat(deposit.amount) * (parseFloat(deposit.per_day_rate) / 100) * diffDays;
            let totalAmount = parseFloat(deposit.amount) + parseFloat(interestAmount);
            
                        
            /*
            if(diffDays > process.env.CD_MINIMUM_INTEREST_HOLD_DAYS){
                let OverdraftTotalDeposit = 0.00;
                const lastOverdraftRecord = await OverdraftDeposit.findOne({
                    where: { user_id: deposit.user_id, type: 'RD' },
                    order: [['created_at', 'DESC']]
                });
                
                if (lastOverdraftRecord) {
                    OverdraftTotalDeposit = parseFloat(lastOverdraftRecord.total_amount) + interestAmount;
                } else {
                    OverdraftTotalDeposit = interestAmount;
                }
                
                await OverdraftDeposit.create({
                    user_id: deposit.user_id,
                    type: 'RD',
                    type_id: deposit.id,
                    amount: deposit.amount,
                    total_days: diffDays,
                    interest_amount: interestAmount.toFixed(2),
                    total_amount: OverdraftTotalDeposit.toFixed(2),
                    deposit_date: new Date(),
                    status: 'Approved'
                });
            }
            */ 
           
            console.log("=>",deposit.id,diffDays,interestAmount,totalAmount);
            
            await deposit.update({
                total_days: diffDays,
                interest_amount: interestAmount.toFixed(2),
                total_amount: totalAmount.toFixed(2)
            });
        }
        
        // Calculate and update the totals in the RD setting
        if (setting_id) {
            // Find the RD setting
            const rdSetting = await RecurringDepositSetting.findByPk(setting_id);
            
            if (rdSetting) {
                // Calculate totals from all deposits associated with this setting
                const settingDeposits = await RecurringDeposit.findAll({
                    where: { setting_id: setting_id }
                });
                
                let totalPrincipal = 0;
                let totalInterest = 0;
                let totalPenalty = 0;
                let totalNetAmount = 0;
                
                settingDeposits.forEach(deposit => {
                    totalPrincipal += parseFloat(deposit.amount || 0);
                    totalInterest += parseFloat(deposit.interest_amount || 0);
                    totalPenalty += parseFloat(deposit.penality_paid_amount || 0);
                    totalNetAmount += parseFloat(deposit.total_amount || 0);
                });
                
                // Update the RD setting with the new totals
                await rdSetting.update({
                    total_principal: totalPrincipal.toFixed(2),
                    total_interest: totalInterest.toFixed(2),
                    total_penality: totalPenalty.toFixed(2),
                    total_net_amount: totalNetAmount.toFixed(2),
                    last_calculated_at: new Date()
                });
                
                return res.json({
                    success: true,
                    message: 'Deposits calculated successfully',
                    count: deposits.length,
                    totals: {
                        principal: totalPrincipal.toFixed(2),
                        interest: totalInterest.toFixed(2),
                        penalty: totalPenalty.toFixed(2),
                        netAmount: totalNetAmount.toFixed(2)
                    }
                });
            }
        }
        
        // If no setting_id or setting not found, return the basic success response
        return res.json({
            success: true,
            message: 'Deposits calculated successfully',
            count: deposits.length
        });
    } catch (error) {
        console.error('Calculate recurring deposits error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error calculating recurring deposits',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while calculating deposits.'
        });
    }
};


// Get RD Transactions controller method
const getRDTransactions = async (req, res) => {
    try {
        const { user_id, setting_id, date, page = 1, limit = 10 } = req.query;
        
        console.log('Request query params:', req.query);
        
        // Validate user_id
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Build the where clause for filtering
        const whereClause = { user_id: parseInt(user_id, 10) };
        
        // Add setting_id filter if provided
        if (setting_id) {
            whereClause.setting_id = parseInt(setting_id, 10);
            console.log('Filtering by setting_id:', whereClause.setting_id);
        }
        
        // Add exact date filter if provided
        if (date) {
            // Create start and end of the specified date
            const filterDate = new Date(date);
            const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));
            
            whereClause.deposit_date = {
                [Op.gte]: startOfDay,
                [Op.lte]: endOfDay
            };
        }
        
        // Calculate offset for pagination
        const offset = (page - 1) * limit;
        
        // Get total count for pagination
        const totalCount = await RecurringDeposit.count({ where: whereClause });
        
        // Log the where clause for debugging
        console.log('Final where clause:', JSON.stringify(whereClause));
        
        // Get transactions with pagination
        const transactions = await RecurringDeposit.findAll({
            where: whereClause,
            order: [['deposit_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: RecurringDepositSetting,
                    as: 'setting',
                    attributes: ['payment_interval', 'amount']
                }
            ]
        }).catch(err => {
            console.error('Error in findAll query:', err);
            throw err;
        });
        
        console.log(`Found ${transactions.length} transactions for the query`);
        
        // Format the transactions to include setting information
        const formattedTransactions = transactions.map(transaction => {
            const plainTransaction = transaction.get({ plain: true });
            return {
                ...plainTransaction,
                payment_interval: plainTransaction.setting?.payment_interval || '',
                amount: plainTransaction.setting?.amount || 0
            };
        });
        
        return res.json({
            success: true,
            transactions: formattedTransactions,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get RD transactions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching RD transactions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching transactions.'
        });
    }
};

// Get RD Settings controller method
const getRDSettings = async (req, res) => {
    try {
        const { user_id, setting_id } = req.query;

        // Build query conditions
        const whereCondition = {};
        if (user_id) {
            whereCondition.user_id = user_id;
        }
        if (setting_id) {
            whereCondition.id = setting_id;
        }

        // Get RD settings
        const settings = await RecurringDepositSetting.findAll({
            where: whereCondition,
            order: [['created_at', 'DESC']]
        });

        // If setting_id is provided, return the specific setting
        if (setting_id) {
            const setting = settings.length > 0 ? settings[0] : null;
            return res.json({
                success: true,
                settings: setting
            });
        }

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Get RD settings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching RD settings',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching settings.'
        });
    }
};

// Add RD Setting controller method
const addRDSetting = async (req, res) => {
    try {
        const { user_id,annual_rate,payment_interval,amount,duration,penality_rate } = req.body;
        // console.log(req.body);
        // Validate inputs
        if (!user_id || !amount || !annual_rate || !payment_interval || !duration || !penality_rate) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Verify user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // // Check if user already has an active setting
        // const existingSetting = await RecurringDepositSetting.findOne({
        //     where: {
        //         user_id,
        //         is_active: 1
        //     }
        // });

        // if (existingSetting) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'User already has an active RD Setting. Please update the existing setting or deactivate it before creating a new one.'
        //     });
        // }

        // Create new RD setting
        const setting = await RecurringDepositSetting.create({
            user_id,
            amount,
            annual_rate,
            payment_interval,
            is_active: 1,
            total_principal: 0,
            total_interest: 0,
            total_penality: 0,
            total_net_amount: 0,
            duration,
            penality_rate
        });

        return res.json({
            success: true,
            message: 'RD Setting added successfully',
            setting
        });
    } catch (error) {
        console.error('Add RD setting error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding RD setting',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while adding the setting.'
        });
    }
};

// Update RD Setting controller method
const updateRDSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, amount, annual_rate, payment_interval, is_active,duration,penality_rate } = req.body;

        // Find the setting
        const setting = await RecurringDepositSetting.findByPk(id);
        
        if (!setting) {
            return res.status(404).json({ 
                success: false, 
                message: 'RD Setting not found' 
            });
        }

        
        // Prepare update data
        const updateData = {
            amount: amount !== undefined ? amount : setting.amount,
            annual_rate: annual_rate !== undefined ? annual_rate : setting.annual_rate,
            payment_interval: payment_interval || setting.payment_interval,
            is_active: is_active !== undefined ? is_active : setting.is_active,
            duration: duration || setting.duration,
            penality_rate: penality_rate || setting.penality_rate
        };

        // Update setting
        await setting.update(updateData);

        return res.json({
            success: true,
            message: 'RD Setting updated successfully',
            setting
        });
    } catch (error) {
        console.error('Update RD setting error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating RD setting',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while updating the setting.'
        });
    }
};

// Get RD Deposits by Setting controller method
const getRDDepositsBySetting = async (req, res) => {
    try {
        const { setting_id } = req.query;

        if (!setting_id) {
            return res.status(400).json({
                success: false,
                message: 'Setting ID is required'
            });
        }

        // Find the setting
        const setting = await RecurringDepositSetting.findByPk(setting_id);
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }
        
        // Determine the setting status
        let settingStatus = 'N/A';
        if (setting.is_active === true || setting.is_active === 1 || String(setting.is_active) === '1') {
            settingStatus = 'Active';
        } else if (setting.is_active === 2 || String(setting.is_active) === '2') {
            settingStatus = 'Closed';
        } else {
            settingStatus = 'Inactive';
        }

        // Get deposits for the setting
        const deposits = await RecurringDeposit.findAll({
            where: { setting_id: setting_id },
            order: [['deposit_date', 'DESC']]
        });

        // Calculate totals
        let totalPrincipal = 0;
        let totalInterest = 0;
        let totalPenalty = 0;
        let totalNet = 0;

        if (deposits && deposits.length > 0) {
            deposits.forEach(deposit => {
                totalPrincipal += parseFloat(deposit.required_amount || 0);
                totalInterest += parseFloat(deposit.interest_amount || 0);
                totalPenalty += parseFloat(deposit.penality_paid_amount || 0);
                totalNet += parseFloat(deposit.total_amount || 0);
            });
        }

        return res.json({
            success: true,
            deposits,
            totals: {
                totalPrincipal,
                totalInterest,
                totalPenalty,
                totalNet
            },
            settingStatus: settingStatus
        });
    } catch (error) {
        console.error('Get RD deposits by setting error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching RD deposits by setting',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching deposits.'
        });
    }
};

// Settle Recurring Deposit controller method
const settleRecurringDeposit = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params; // User ID
        const { 
            setting_id, 
            settlement_date, 
            net_amount, 
            total_principal,
            total_interest,
            total_penality, // Using the correct field name
            notes 
        } = req.body;
        
        // Validate required fields
        if (!setting_id || !settlement_date || !net_amount) {
            return res.status(400).json({
                success: false,
                message: 'Setting ID, settlement date, and net amount are required'
            });
        }
        
        // Find the RD setting
        const rdSetting = await RecurringDepositSetting.findOne({
            where: { id: setting_id, user_id: id }
        });
        
        if (!rdSetting) {
            return res.status(404).json({
                success: false,
                message: 'RD setting not found'
            });
        }
        
        // Check if setting is already closed
        if (rdSetting.is_active === 2 || String(rdSetting.is_active) === '2') {
            return res.status(400).json({
                success: false,
                message: 'This RD setting is already settled/closed'
            });
        }
        
        // Update the RD setting to closed status with the new values
        await rdSetting.update({
            is_active: 2, // Set status to closed
            settlement_date: settlement_date,
            settlement_notes: notes,
            total_principal: total_principal || rdSetting.total_principal,
            total_interest: total_interest || rdSetting.total_interest,
            total_penality: total_penality || rdSetting.total_penality,
            total_net_amount: net_amount,
            last_updated_at: new Date()
        }, { transaction: t });

        await OverdraftDeposit.create({
            user_id: rdSetting.user_id,
            type: 'RD',
            type_id: setting_id,
            amount: total_principal,
            interest_amount: total_interest,
            total_amount: net_amount,
            deposit_date: new Date(),
            status: 'Approved'
        }, { transaction: t });
        
        await RecurringDeposit.update({
            status: 'Closed'            
        }, { where: { setting_id: setting_id }, transaction: t });
        
        // Commit the transaction
        await t.commit();
        
        return res.json({
            success: true,
            message: 'RD account settled successfully',
            settingId: setting_id
        });
    } catch (error) {
        // Rollback transaction in case of error
        await t.rollback();
        
        console.error('Settle recurring deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error settling recurring deposit',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while settling the account.'
        });
    }
};

const getUserSettingList = async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const settings = await RecurringDepositSetting.findAll({
            where: { user_id: user_id },
            order: [['created_at', 'DESC']]
        });

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Get user setting list error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching user setting list',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching the setting list.'
        });
    }
};

module.exports = {
    addRDSetting,
    updateRDSetting,
    getRDDepositsBySetting,
    getRecurringDeposit,
    addRecurringDeposit,
    updateRecurringDeposit,
    calculateRecurringDeposits,
    getRDTransactions,
    getRDSettings,    
    settleRecurringDeposit,
    getUserSettingList
};
