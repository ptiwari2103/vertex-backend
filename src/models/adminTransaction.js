const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class AdminTransaction extends Model {
    static associate(models) {
        AdminTransaction.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
        AdminTransaction.belongsTo(models.UserPaymentRequest, {
            foreignKey: 'request_id',
            as: 'request'
        });
    }
}

AdminTransaction.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    request_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    comment: {
        type: DataTypes.TEXT,
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
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'AdminTransaction',
    tableName: 'admin_transaction',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
});

module.exports = AdminTransaction;
