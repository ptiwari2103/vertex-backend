const { Op } = require('sequelize');
const { User, AdminTransaction } = require('../models');
const { currencyUnit, formatCurrency } = require('../utils/currencyFormatter');

/**
 * Render the admin transactions page with pagination
 */
const getAllTransactions = async (req, res) => {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Get search parameters
        const search = req.query.search || '';
        const user_id = req.query.user_id || '';
        
        // Build where clause for search
        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { type: { [Op.like]: `%${search}%` } },
                { comment: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (user_id) {
            whereClause['$user.user_id$'] = { [Op.like]: `%${user_id}%` };
        }
        
        console.log('Fetching admin transactions with whereClause:', whereClause);
        
        // Get transactions with pagination
        const { count, rows: transactions } = await AdminTransaction.findAndCountAll({
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
        
        console.log(`Found ${count} admin transactions`);
        
        // Calculate pagination details
        const totalPages = Math.ceil(count / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        // Render the transactions page
        res.render('transactions/list', {
            title: 'Admin Transactions - Vertex Admin',
            currentPage: 'transactions',
            transactions,
            pagination: {
                page,
                limit,
                totalItems: count,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            search,
            user_id: user_id,
            currencyUnit,
            formatCurrency,
            success: req.query.success || '',
            error: req.query.error || ''
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).render('transactions/list', {
            title: 'Admin Transactions - Vertex Admin',
            currentPage: 'transactions',
            transactions: [],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false
            },
            search: '',
            success: '',
            error: 'Failed to load transactions. Please try again.'
        });
    }
};

module.exports = {
    getAllTransactions
};
