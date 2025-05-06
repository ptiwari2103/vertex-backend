const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserTransaction extends Model {
    static associate(models) {
        UserTransaction.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
        
        // Add association to UserPaymentRequest
        UserTransaction.belongsTo(models.UserPaymentRequest, {
            foreignKey: 'user_payable_request_id',
            as: 'paymentRequest'
        });
    }
}

UserTransaction.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_payable_request_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },    
    card_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    payment_category: {
        type: DataTypes.ENUM('Card_Use_Request', 'Card_Payable_Request'),
        allowNull: false
    },
    comment: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    deposit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    added: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    used: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    used_interest: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    used_net_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    days: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    interest_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    calculate_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Active', 'Closed'),
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'UserTransaction',
    tableName: 'user_transaction',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
});

module.exports = UserTransaction;
