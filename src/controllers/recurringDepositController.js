const { User, Profile, RecurringDepositSetting, RecurringDeposit, RecurringDepositTransaction, OverdraftDeposit } = require('../models');
const { sequelize, Sequelize } = require('../config/database');
const { Op } = require('sequelize');

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
        const { formatCurrency } = require('../utils/currencyFormatter');
        
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
    const t = await sequelize.transaction();
    
    try {
        const { 
            setting_id, 
            amount, 
            deposit_date, 
            payment_method, 
            transaction_id, 
            per_day_rate,
            required_amount,
            payment_interval,
            penality_paid_amount,
            total_amount,
            comments,
            status
        } = req.body;

        // Validate required fields
        if (!setting_id || !amount || !deposit_date) {
            return res.status(400).json({
                success: false,
                message: 'Setting ID, amount, and deposit date are required'
            });
        }

        // Find the RD setting
        const rdSetting = await RecurringDepositSetting.findByPk(setting_id);
        if (!rdSetting) {
            return res.status(404).json({
                success: false,
                message: 'RD setting not found'
            });
        }

        // Check if setting is active
        if (rdSetting.is_active !== 1 && String(rdSetting.is_active) !== '1') {
            return res.status(400).json({
                success: false,
                message: 'Cannot add deposit to an inactive RD setting'
            });
        }

        // Calculate interest based on per day rate
        const depositDate = new Date(deposit_date);
        const today = new Date();
        const diffTime = Math.abs(today - depositDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate interest amount
        const interestAmount = parseFloat(amount) * (parseFloat(per_day_rate) / 100) * diffDays;
        
        // Create the deposit
        const deposit = await RecurringDeposit.create({
            user_id: rdSetting.user_id,
            setting_id,
            amount,
            deposit_date,
            payment_method,
            transaction_id,
            per_day_rate,
            required_amount,
            payment_interval,
            interest_amount: interestAmount.toFixed(2),
            penality_paid_amount: penality_paid_amount || 0,
            total_amount: parseFloat(amount) + interestAmount - parseFloat(penality_paid_amount || 0),
            comments,
            status: status || 'Pending'
        }, { transaction: t });

        // Commit the transaction
        await t.commit();

        return res.json({
            success: true,
            message: 'Deposit added successfully',
            deposit
        });
    } catch (error) {
        // Rollback transaction in case of error
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
    const t = await sequelize.transaction();
    
    try {
        const { deposit_id } = req.params;
        const { 
            amount, 
            deposit_date, 
            payment_method, 
            transaction_id, 
            per_day_rate,
            required_amount,
            payment_interval,
            penality_paid_amount,
            comments,
            status
        } = req.body;

        // Find the deposit
        const deposit = await RecurringDeposit.findByPk(deposit_id);
        if (!deposit) {
            return res.status(404).json({
                success: false,
                message: 'Deposit not found'
            });
        }

        // Check if deposit is in a closed setting
        const rdSetting = await RecurringDepositSetting.findByPk(deposit.setting_id);
        if (rdSetting && (rdSetting.is_active === 2 || String(rdSetting.is_active) === '2')) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update deposit in a closed RD setting'
            });
        }

        // Calculate interest based on per day rate
        const depositDate = new Date(deposit_date || deposit.deposit_date);
        const today = new Date();
        const diffTime = Math.abs(today - depositDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate interest amount
        const interestAmount = parseFloat(amount || deposit.amount) * (parseFloat(per_day_rate || deposit.per_day_rate) / 100) * diffDays;
        
        // Calculate total amount
        const totalAmount = parseFloat(amount || deposit.amount) + interestAmount - parseFloat(penality_paid_amount || deposit.penality_paid_amount || 0);
        
        // Update the deposit
        await deposit.update({
            amount: amount || deposit.amount,
            deposit_date: deposit_date || deposit.deposit_date,
            payment_method: payment_method || deposit.payment_method,
            transaction_id: transaction_id || deposit.transaction_id,
            per_day_rate: per_day_rate || deposit.per_day_rate,
            required_amount: required_amount || deposit.required_amount,
            payment_interval: payment_interval || deposit.payment_interval,
            interest_amount: interestAmount.toFixed(2),
            penality_paid_amount: penality_paid_amount !== undefined ? penality_paid_amount : deposit.penality_paid_amount,
            total_amount: totalAmount.toFixed(2),
            comments: comments || deposit.comments,
            status: status || deposit.status
        }, { transaction: t });

        // Commit the transaction
        await t.commit();

        return res.json({
            success: true,
            message: 'Deposit updated successfully',
            deposit
        });
    } catch (error) {
        // Rollback transaction in case of error
        await t.rollback();
        
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
    const t = await sequelize.transaction();
    
    try {
        const { setting_id } = req.body;
        
        if (!setting_id) {
            return res.status(400).json({
                success: false,
                message: 'Setting ID is required'
            });
        }
        
        // Find the RD setting
        const rdSetting = await RecurringDepositSetting.findByPk(setting_id);
        if (!rdSetting) {
            return res.status(404).json({
                success: false,
                message: 'RD setting not found'
            });
        }
        
        // Get all deposits for this setting
        const settingDeposits = await RecurringDeposit.findAll({
            where: { setting_id }
        });
        
        // Calculate totals
        let totalPrincipal = 0;
        let totalInterest = 0;
        let totalPenalty = 0;
        let totalNetAmount = 0;
        
        // Update each deposit's interest and total
        let updatedCount = 0;
        
        for (const deposit of settingDeposits) {
            // Calculate interest based on per day rate
            const depositDate = new Date(deposit.deposit_date);
            const today = new Date();
            const diffTime = Math.abs(today - depositDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Calculate interest amount
            const interestAmount = parseFloat(deposit.amount) * (parseFloat(deposit.per_day_rate) / 100) * diffDays;
            
            // Calculate total amount
            const totalAmount = parseFloat(deposit.amount) + interestAmount - parseFloat(deposit.penality_paid_amount || 0);
            
            // Update the deposit
            await deposit.update({
                interest_amount: interestAmount.toFixed(2),
                total_amount: totalAmount.toFixed(2)
            }, { transaction: t });
            
            updatedCount++;
        }
        
        // Recalculate totals after updates
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
        
        // Commit the transaction
        await t.commit();
        
        return res.json({
            success: true,
            message: 'Deposits calculated successfully',
            count: updatedCount,
            totals: {
                principal: totalPrincipal.toFixed(2),
                interest: totalInterest.toFixed(2),
                penalty: totalPenalty.toFixed(2),
                netAmount: totalNetAmount.toFixed(2)
            }
        });
    } catch (error) {
        // Rollback transaction in case of error
        await t.rollback();
        
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
        const { user_id, setting_id } = req.query;

        // Build query conditions
        const whereCondition = {};
        if (user_id) {
            whereCondition.user_id = user_id;
        }
        if (setting_id) {
            whereCondition.setting_id = setting_id;
        }

        // Get RD transactions
        const transactions = await RecurringDepositTransaction.findAll({
            where: whereCondition,
            order: [['transaction_date', 'DESC']]
        });

        return res.json({
            success: true,
            transactions
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

        // Validate setting_id
        if (!setting_id) {
            return res.status(400).json({
                success: false,
                message: 'Setting ID is required'
            });
        }

        // Find the RD setting
        const setting = await RecurringDepositSetting.findByPk(setting_id);
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'RD setting not found'
            });
        }

        // Get deposits for the setting
        const deposits = await RecurringDeposit.findAll({
            where: { setting_id },
            order: [['deposit_date', 'DESC']]
        });

        return res.json({
            success: true,
            setting,
            deposits
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
    settleRecurringDeposit
};
