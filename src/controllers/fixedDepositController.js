const { User, Profile, FixedDepositSetting, FixedDeposit, OverdraftDeposit, AdminTransaction } = require('../models');
const sequelize = require('../config/database');
const { Op, Sequelize } = require('sequelize');
const { formatCurrency, formatamount } = require('../utils/currencyFormatter');


// Get Fixed Deposit controller method
const getFixedDeposit = async (req, res) => {
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
        const settings = await FixedDepositSetting.findAll({
            where: { user_id: id },
            order: [['created_at', 'DESC']]
        });

        // Find active setting
        let activeSetting = null;
        if (setting_id) {
            // If setting_id is provided, use that
            activeSetting = await FixedDepositSetting.findOne({
                where: { id: setting_id, user_id: id }
            });
        } else {
            // Otherwise, find the active setting
            activeSetting = await FixedDepositSetting.findOne({
                where: { user_id: id, is_active: { [Op.in]: [1, 2] } },
                order: [['created_at', 'DESC']]
            });
        }

        // Get deposits for the active setting
        // let deposits = [];
        // if (activeSetting) {
            deposits = await FixedDeposit.findAll({
                where: { user_id: id },
                order: [['deposit_date', 'DESC']]
            });
        //}

        // Get the formatCurrency utility
        const { formatCurrency, formatamount } = require('../utils/currencyFormatter');
        
        // Render the view
        res.render('members/fixed-deposit', {
            title: 'Fixed Deposit - Vertex Admin',
            currentPage: 'members',
            user: JSON.stringify(req.session.user, null, 2),
            member,
            deposits,
            formatCurrency: formatCurrency,
            activeSetting,
            allSettings: settings
        });
    } catch (error) {
        console.error('Get fixed deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching fixed deposit data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching data.'
        });
    }
};

// Add Fixed Deposit controller method
const addFixedDeposit = async (req, res) => {
    // Begin transaction to ensure data consistency
    // const { formatCurrency, formatamount } = require('../utils/currencyFormatter');
    
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { setting_id, per_day_rate, required_amount, amount, payment_method, transaction_id, comments, status} = req.body;
        console.log('Request body:', req.body);
        
        // Validate user exists
        const user = await User.findByPk(id, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Member not found' 
            });
        }

        // Create new deposit record with default values for required fields
        const deposit = await FixedDeposit.create({
            user_id: id,
            setting_id: setting_id,
            per_day_rate,
            required_amount,
            payment_interval: 'Yearly', // Default value
            amount: parseFloat(amount),
            total_amount: parseFloat(amount),            
            payment_method,
            transaction_id,
            comments,
            deposit_date: new Date(),
            due_date: new Date(), // Default to current date
            penality_amount: 0, // Default value
            penality_paid_amount: 0, // Default value
            status: status || 'Pending' 
        }, { transaction: t });

        // Commit the transaction
        await t.commit();

        return res.json({
            success: true,  
            message: 'Fixed deposit added successfully',
            deposit
        });
    } catch (error) {
        // If any error occurs, rollback the transaction
        await t.rollback();
        
        console.error('Add fixed deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding fixed deposit',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while adding the deposit.'
        });
    }
};


// Update Fixed Deposit controller method
const updateFixedDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { per_day_rate, required_amount, payment_method, transaction_id, comments, status, setting_id, total_interest } = req.body;

        // Find the deposit
        const deposit = await FixedDeposit.findByPk(id);
        
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
            payment_method,
            transaction_id,
            comments,
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

// Calculate Fixed Deposits controller method
const calculateFixedDeposits = async (req, res) => {
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
        const deposits = await FixedDeposit.findAll({
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
            const fdSetting = await FixedDepositSetting.findByPk(setting_id);
            
            if (fdSetting) {
                // Calculate totals from all deposits associated with this setting
                const settingDeposits = await FixedDeposit.findAll({
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
                
                // Update the FD setting with the new totals
                await fdSetting.update({
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


// Get FD Transactions controller method
const getFDTransactions = async (req, res) => {
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
        const totalCount = await FixedDeposit.count({ where: whereClause });
        
        // Log the where clause for debugging
        console.log('Final where clause:', JSON.stringify(whereClause));
        
        // Get transactions with pagination
        const transactions = await FixedDeposit.findAll({
            where: whereClause,
            order: [['deposit_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            
        }).catch(err => {
            console.error('Error in findAll query:', err);
            throw err;
        });
        
        console.log(`Found ${transactions.length} transactions for the query`);
        
        // Format the transactions to include setting information
        // const formattedTransactions = transactions.map(transaction => {
        //     const plainTransaction = transaction.get({ plain: true });
        //     return {
        //         ...plainTransaction,
        //         amount: plainTransaction.setting?.amount || 0
        //     };
        // });
        
        return res.json({
            success: true,
            transactions: transactions,
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

// Get FD Settings controller method
const getFDSettings = async (req, res) => {
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
        const settings = await FixedDepositSetting.findAll({
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
        console.error('Get FD settings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching FD settings',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching settings.'
        });
    }
};

// Add FD Setting controller method
const addFDSetting = async (req, res) => {
    try {
        const { user_id,annual_rate,amount,duration,maturity_amount,indirect_referral_rate,direct_referral_rate } = req.body;
        console.log(req.body);
        // Validate inputs
        if (!user_id || !amount || !annual_rate || !duration || !maturity_amount || !indirect_referral_rate || !direct_referral_rate) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Validate that maturity amount is greater than amount
        if (parseFloat(maturity_amount) <= parseFloat(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Maturity Amount must be greater than Amount'
            });
        }
        
        // Validate that annual rate is not more than 99%
        if (parseFloat(annual_rate) > 99) {
            return res.status(400).json({
                success: false,
                message: 'Annual Rate cannot be more than 99%'
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
        // const existingSetting = await FixedDepositSetting.findOne({
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
        const setting = await FixedDepositSetting.create({
            user_id,
            amount,
            annual_rate,
            duration,
            maturity_amount,
            indirect_referral_rate,
            direct_referral_rate,
            is_active: 1,
            total_principal: 0,
            total_interest: 0,
            total_maturity_amount: 0,
            total_net_amount: 0
        });

        return res.json({
            success: true,
            message: 'FD Setting added successfully',
            setting
        });
    } catch (error) {
        console.error('Add FD setting error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding FD setting',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while adding the setting.'
        });
    }
};

// Update FD Setting controller method
const updateFDSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, amount, annual_rate, duration, maturity_amount, indirect_referral_rate, direct_referral_rate, is_active } = req.body;

        // Validate that maturity amount is greater than amount (if both are provided)
        if (amount !== undefined && maturity_amount !== undefined) {
            if (parseFloat(maturity_amount) <= parseFloat(amount)) {
                return res.status(400).json({
                    success: false,
                    message: 'Maturity Amount must be greater than Amount'
                });
            }
        }
        
        // Validate that annual rate is not more than 99%
        if (annual_rate !== undefined && parseFloat(annual_rate) > 99) {
            return res.status(400).json({
                success: false,
                message: 'Annual Rate cannot be more than 99%'
            });
        }
        
        // Find the setting
        const setting = await FixedDepositSetting.findByPk(id);
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'FD Setting not found'
            });
        }

        
        // Prepare update data
        const updateData = {
            amount: amount !== undefined ? amount : setting.amount,
            annual_rate: annual_rate !== undefined ? annual_rate : setting.annual_rate,
            duration: duration !== undefined ? duration : setting.duration,
            maturity_amount: maturity_amount !== undefined ? maturity_amount : setting.maturity_amount,
            indirect_referral_rate: indirect_referral_rate !== undefined ? indirect_referral_rate : setting.indirect_referral_rate,
            direct_referral_rate: direct_referral_rate !== undefined ? direct_referral_rate : setting.direct_referral_rate,
            is_active: is_active !== undefined ? is_active : setting.is_active
        };

        // Update setting
        await setting.update(updateData);

        return res.json({
            success: true,
            message: 'FD Setting updated successfully',
            setting
        });
    } catch (error) {
        console.error('Update FD setting error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating FD setting',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while updating the setting.'
        });
    }
};

// Get FD Deposits by Setting controller method
const getFDBySetting = async (req, res) => {
    try {
        const { setting_id } = req.query;

        if (!setting_id) {
            return res.status(400).json({
                success: false,
                message: 'Setting ID is required'
            });
        }

        // Find the setting
        const setting = await FixedDepositSetting.findByPk(setting_id);
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
        const deposits = await FixedDeposit.findAll({
            where: { setting_id: setting_id },
            order: [['deposit_date', 'DESC']]
        });

        // Calculate totals
        let totalPrincipal = setting.amount;
        let totalInterest = setting.total_interest;
        let totalMaturityAmount = setting.maturity_amount;
        let totalNet = setting.total_net_amount;

        // if (deposits && deposits.length > 0) {
        //     deposits.forEach(deposit => {
        //         totalPrincipal += parseFloat(deposit.required_amount || 0);
        //         totalInterest += parseFloat(deposit.interest_amount || 0);
        //         totalPenalty += parseFloat(deposit.penality_paid_amount || 0);
        //         totalNet += parseFloat(deposit.total_amount || 0);
        //     });
        // }

        return res.json({
            success: true,
            deposits,
            totals: {
                totalPrincipal,
                totalInterest,
                totalMaturityAmount,
                totalNet
            },
            settingStatus: settingStatus
        });
    } catch (error) {
        console.error('Get FD deposits by setting error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching FD deposits by setting',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching deposits.'
        });
    }
};

// Settle Fixed Deposit controller method
const settleFixedDeposit = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params; // User ID
        const { 
            setting_id, 
            settlement_date, 
            net_amount, 
            total_principal,
            total_interest,            
            notes 
        } = req.body;
        
        // Validate required fields
        if (!setting_id || !settlement_date || !net_amount) {
            return res.status(400).json({
                success: false,
                message: 'Setting ID, settlement date, and net amount are required'
            });
        }
        
        // Find the FD setting
        const fdSetting = await FixedDepositSetting.findOne({
            where: { id: setting_id, user_id: id }
        });
        
        if (!fdSetting) {
            return res.status(404).json({
                success: false,
                message: 'FD setting not found'
            });
        }
        
        // Check if setting is already closed
        if (fdSetting.is_active === 2 || String(fdSetting.is_active) === '2') {
            return res.status(400).json({
                success: false,
                message: 'This FD setting is already settled/closed'
            });
        }
        
        // Update the FD setting to closed status with the new values
        await fdSetting.update({
            is_active: 2, // Set status to closed
            settlement_date: settlement_date,
            settlement_notes: notes,
            total_principal: total_principal || fdSetting.total_principal,
            total_interest: total_interest || fdSetting.total_interest,
            total_net_amount: net_amount,
            last_updated_at: new Date()
        }, { transaction: t });

        await OverdraftDeposit.create({
            user_id: fdSetting.user_id,
            type: 'FD',
            type_id: setting_id,
            amount: total_principal,
            interest_amount: total_interest,
            total_amount: net_amount,
            deposit_date: new Date(),
            status: 'Approved'
        }, { transaction: t });
        
        await FixedDeposit.update({
            status: 'Closed'            
        }, { where: { setting_id: setting_id }, transaction: t });
        
        // Commit the transaction
        await t.commit();
        
        return res.json({
            success: true,
            message: 'FD account settled successfully',
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

        const settings = await FixedDepositSetting.findAll({
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
    addFDSetting,
    updateFDSetting,
    getFDBySetting,
    getFixedDeposit,
    addFixedDeposit,
    updateFixedDeposit,
    calculateFixedDeposits,
    getFDSettings,    
    settleFixedDeposit,
    getUserSettingList,
    getFDTransactions
};
