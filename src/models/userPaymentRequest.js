const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserPaymentRequest extends Model {
    static associate(models) {
        UserPaymentRequest.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    }
}

UserPaymentRequest.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    payment_category: {
        type: DataTypes.ENUM('Card_Use_Request', 'Card_Payment_Request'),
        allowNull: false
    },
    comment: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved'),
        allowNull: false,
        defaultValue: 'Pending'
    }
}, {
    sequelize,
    modelName: 'UserPaymentRequest',
    tableName: 'user_payment_request',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
});

module.exports = UserPaymentRequest;
