const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserTransaction extends Model {
    static associate(models) {
        UserTransaction.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    }
}

UserTransaction.init({
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
        type: DataTypes.ENUM('Card', 'Loan', 'Cash', 'Other'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type:{
        type: DataTypes.ENUM('credit', 'debit'),
        allowNull: false,
        defaultValue: 'credit',
        comment: 'credit:amount come, debit:amount go'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Transaction amount'
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Balance after transaction'
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
