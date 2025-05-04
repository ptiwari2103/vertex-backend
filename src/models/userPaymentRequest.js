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
    card_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    request_type: {
        type: DataTypes.ENUM('use', 'payable'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    remaining_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transaction_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payment_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending'
    }
}, {
    sequelize,
    modelName: 'UserPaymentRequest',
    tableName: 'user_payment_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = UserPaymentRequest;
