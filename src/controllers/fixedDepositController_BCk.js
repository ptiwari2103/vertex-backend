const { User, Profile, FixedDeposit, FixedDepositSetting, OverdraftDeposit } = require("../models");

// Fixed Deposit functionality
const getFixedDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get user details
        const user = await User.findByPk(id, {
            include: [
                {
                    model: Profile,
                    as: 'profile'
                }
            ]
        });

        if (!user) {
            return res.status(404).render('error', {
                title: 'Error - Vertex Admin',
                message: 'Member not found',
                error: 'The requested member could not be found.',
                style: '',
                script: '',
                user: null
            });
        }

        // Get all fixed deposits for this user
        const deposits = await FixedDeposit.findAll({
            where: { user_id: id },
            order: [['deposit_date', 'DESC']]
        });

        // Render the fixed deposit page
        res.render('members/fixed-deposit', {
            title: 'Fixed Deposit - Vertex Admin',
            currentPage: 'members',
            user: JSON.stringify(req.session.user, null, 2),
            member: user,
            deposits: deposits
        });
    } catch (error) {
        console.error('Fixed deposit error:', error);
        res.render('error', {
            title: 'Error - Vertex Admin',
            message: 'Error fetching fixed deposit details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching deposit details.',
            style: '',
            script: '',
            user: null
        });
    }
};

const addFixedDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { setting_id, per_day_rate, required_amount, payment_interval, amount, payment_method, transaction_id, comments, status, penality_amount, penality_paid_amount, maturity_date } = req.body;
        console.log(req.body);
        
        // Validate user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Member not found' 
            });
        }

        // Create new deposit record
        const deposit = await FixedDeposit.create({
            user_id: id,
            setting_id: setting_id,
            per_day_rate,
            required_amount,
            payment_interval,
            amount,
            total_amount: amount,            
            payment_method,
            transaction_id,
            comments,
            deposit_date: new Date(),
            maturity_date: maturity_date || null,
            penality_amount: penality_amount || 0,
            penality_paid_amount: penality_paid_amount || 0,
            status: status || 'Pending' 
        });

        return res.json({
            success: true,
            message: 'Fixed deposit added successfully',
            deposit
        });
    } catch (error) {
        console.error('Add fixed deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding fixed deposit',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while adding the deposit.'
        });
    }
};

const updateFixedDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { per_day_rate, required_amount, payment_interval, amount, payment_method, transaction_id, comments, status, penality_amount, penality_paid_amount, setting_id, maturity_date } = req.body;

        // Find the deposit
        const deposit = await FixedDeposit.findByPk(id);
        
        if (!deposit) {
            return res.status(404).json({ 
                success: false, 
                message: 'Deposit record not found' 
            });
        }

        // Update deposit
        await deposit.update({
            per_day_rate,
            required_amount,
            amount,
            payment_interval,
            payment_method,
            transaction_id,
            comments,
            penality_amount,
            penality_paid_amount,
            maturity_date,
            status,
            setting_id
        });

        return res.json({
            success: true,
            message: 'Fixed deposit updated successfully',
            deposit
        });
    } catch (error) {
        console.error('Update fixed deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating fixed deposit',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while updating the deposit.'
        });
    }
};

// Calculate Fixed Deposits controller method
const calculateFixedDeposits = async (req, res) => {
    try {
        const { id } = req.params; // User ID
        
        // Find all deposits for the user
        const deposits = await FixedDeposit.findAll({
            where: { user_id: id },
            order: [['deposit_date', 'ASC']]
        });
        
        if (!deposits || deposits.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No deposits found for this user'
            });
        }
        
        // Perform calculations for each deposit
        for (const deposit of deposits) {
            // Example calculation logic - update as needed
            const depositDate = new Date(deposit.deposit_date);
            const currentDate = new Date();
            const diffTime = Math.abs(currentDate - depositDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Calculate interest based on per_day_rate and days
            const interestAmount = parseFloat(deposit.amount) * (parseFloat(deposit.per_day_rate) / 100) * diffDays;
            let totalAmount = parseFloat(deposit.amount) + interestAmount;
            
            if(diffDays > process.env.FD_MINIMUM_INTEREST_HOLD_DAYS || 30){
                // Insert a copy of interest amount into OverdraftDeposit table
                // Get the last record's total_amount for this user_id and type
                let OverdraftTotalDeposit = 0.00;
                const lastOverdraftRecord = await OverdraftDeposit.findOne({
                    where: { user_id: deposit.user_id, type: 'FD' },
                    order: [['created_at', 'DESC']]
                });
                
                // If record found, add the interest amount to the last total_amount
                if (lastOverdraftRecord) {
                    OverdraftTotalDeposit = parseFloat(lastOverdraftRecord.total_amount) + interestAmount;
                } else {
                    // If no record found, initialize with just the interest amount
                    OverdraftTotalDeposit = interestAmount;
                }
                
                await OverdraftDeposit.create({
                    user_id: deposit.user_id,
                    type: 'FD',
                    type_id: deposit.id,
                    amount: deposit.amount,
                    total_days: diffDays,
                    interest_amount: interestAmount.toFixed(2),
                    total_amount: OverdraftTotalDeposit.toFixed(2),
                    deposit_date: new Date(),
                    status: 'Approved'
                });
            }
            
            // Update the deposit record
            await deposit.update({
                total_days: diffDays,
                interest_amount: interestAmount.toFixed(2),
                total_amount: totalAmount.toFixed(2)
            });
        }
        
        return res.json({
            success: true,
            message: 'Deposits calculated successfully',
            count: deposits.length
        });
    } catch (error) {
        console.error('Calculate fixed deposits error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error calculating fixed deposits',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while calculating deposits.'
        });
    }
};

// FD Settings controller methods
const getFDSettings = async (req, res) => {
    try {
        const { user_id } = req.query;
        
        let whereClause = {};
        if (user_id) {
            whereClause.user_id = user_id;
        }
        
        const settings = await FixedDepositSetting.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']]
        });
        
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

const addFDSetting = async (req, res) => {
    try {
        const { user_id, annual_rate, payment_interval, amount, duration, penality_rate, is_active } = req.body;
        
        // Validate user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Member not found' 
            });
        }
        
        // If is_active is true, set all other settings to inactive
        if (is_active) {
            await FixedDepositSetting.update(
                { is_active: false },
                { where: { user_id } }
            );
        }
        
        // Create new setting
        const setting = await FixedDepositSetting.create({
            user_id,
            annual_rate,
            payment_interval,
            amount,
            duration,
            penality_rate,
            is_active
        });
        
        return res.json({
            success: true,
            message: 'Fixed deposit setting added successfully',
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

const updateFDSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const { annual_rate, payment_interval, amount, duration, penality_rate, is_active } = req.body;
        
        // Find the setting
        const setting = await FixedDepositSetting.findByPk(id);
        
        if (!setting) {
            return res.status(404).json({ 
                success: false, 
                message: 'Setting not found' 
            });
        }
        
        // If is_active is being set to true, set all other settings to inactive
        if (is_active) {
            await FixedDepositSetting.update(
                { is_active: false },
                { 
                    where: { 
                        user_id: setting.user_id,
                        id: { [Op.ne]: id } // Not equal to the current setting ID
                    } 
                }
            );
        }
        
        // Update setting
        await setting.update({
            annual_rate,
            payment_interval,
            amount,
            duration,
            penality_rate,
            is_active
        });
        
        return res.json({
            success: true,
            message: 'Fixed deposit setting updated successfully',
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

// Get FD Transactions with search and pagination
const getFDTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;
        const offset = (page - 1) * limit;
        
        // Build where clause for search
        let whereClause = {};
        if (search) {
            whereClause = {
                [Op.or]: [
                    { '$User.name$': { [Op.like]: `%${search}%` } },
                    { '$User.mobile_number$': { [Op.like]: `%${search}%` } },
                    { '$User.account_number$': { [Op.like]: `%${search}%` } },
                    { '$User.user_id$': { [Op.like]: `%${search}%` } }
                ]
            };
        }
        
        // Add status filter if provided
        if (status) {
            whereClause.status = status;
        }
        
        // Get total count for pagination
        const totalCount = await FixedDeposit.count({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'mobile_number', 'account_number', 'user_id']
                }
            ],
            distinct: true
        });
        
        // Get transactions with pagination
        const transactions = await FixedDeposit.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'mobile_number', 'account_number', 'user_id']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        res.render('transactions/fd-transactions', {
            title: 'Fixed Deposit Transactions - Vertex Admin',
            currentPage: 'fd-transactions',
            user: JSON.stringify(req.session.user, null, 2),
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            search,
            status
        });
    } catch (error) {
        console.error('Get FD transactions error:', error);
        res.render('error', {
            title: 'Error - Vertex Admin',
            message: 'Error fetching FD transactions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching transactions.',
            style: '',
            script: '',
            user: null
        });
    }
};

module.exports = {
    getFixedDeposit,
    addFixedDeposit,
    updateFixedDeposit,
    calculateFixedDeposits,
    getFDSettings,
    addFDSetting,
    updateFDSetting,
    getFDTransactions
};
