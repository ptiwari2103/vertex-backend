// Updated implementation of renderReceivedList function to match frontend expectations
// This should be copied into giftController.js to replace the current function

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
            
            // Get distributor details
            const distributor = await GiftDistributor.findByPk(record.distributor_id, {
                attributes: ['id', 'user_id']
            });
            
            // Get distributor's user details
            let distributorName = null;
            if (distributor && distributor.user_id) {
                const distributorUser = await User.findByPk(distributor.user_id, {
                    attributes: ['name']
                });
                distributorName = distributorUser ? distributorUser.name : null;
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
