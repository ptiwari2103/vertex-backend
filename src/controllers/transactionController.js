const { AdminTransaction, User, UserPaymentRequest } = require('../models');
const { Op } = require('sequelize');

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
        
        // Build where clause for search
        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { type: { [Op.like]: `%${search}%` } },
                { comment: { [Op.like]: `%${search}%` } }
            ];
        }
        
        // Get transactions with pagination
        const { count, rows: transactions } = await AdminTransaction.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'user_id']
                },
                {
                    model: UserPaymentRequest,
                    as: 'request',
                    attributes: ['id', 'amount', 'status']
                }
            ],
            order: [['created_date', 'DESC']],
            limit,
            offset
        });
        
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
