const updateRDSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, annual_rate, payment_interval, amount, duration, is_active } = req.body;

        // Find the setting
        const setting = await RecurringDepositSetting.findByPk(id);
        
        if (!setting) {
            return res.status(404).json({ 
                success: false, 
                message: 'RD Setting not found' 
            });
        }

        // Check if trying to activate a setting
        if (is_active === true && !setting.is_active) {
            // Check if user already has an active setting
            const existingSetting = await RecurringDepositSetting.findOne({
                where: {
                    user_id: user_id || setting.user_id,
                    is_active: true,
                    id: { [Op.ne]: id } // Exclude current setting
                }
            });

            if (existingSetting) {
                return res.status(400).json({
                    success: false,
                    message: 'User already has an active RD Setting. Please deactivate it before activating this one.'
                });
            }
        }
        
        // If this is an active setting being updated (not changing activation status),
        // we should allow the update without additional checks
        if (setting.is_active && is_active !== false) {
            // This is an update to an already active setting, which is allowed
        }

        // Prepare update data
        const updateData = {
            annual_rate: annual_rate !== undefined ? annual_rate : setting.annual_rate,
            payment_interval: payment_interval || setting.payment_interval,
            amount: amount !== undefined ? amount : setting.amount,
            duration: duration !== undefined ? duration : setting.duration,
            is_active: is_active !== undefined ? is_active : setting.is_active
        };

        // If user_id is provided, verify user exists
        if (user_id !== undefined && user_id !== setting.user_id) {
            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            updateData.user_id = user_id;
        }

        // Update the setting
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
