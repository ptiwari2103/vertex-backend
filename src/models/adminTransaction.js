const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class AdminTransaction extends Model {
    static associate(models) {
        AdminTransaction.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
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
        allowNull: true,
        comment: 'ID of the related request'
    },
    transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of the related user transaction'
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    comment: {
        type: DataTypes.STRING,
        allowNull: true
    },
    added: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
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
