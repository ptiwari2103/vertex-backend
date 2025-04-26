const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class GeneralSetting extends Model {}

GeneralSetting.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    compulsory_deposit: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    recurring_deposit: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    fixed_deposit: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    loan_against_gold: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    loan_against_mortgage_property: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    loan_for_livelihood: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    loan_for_women_livelihood: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    emergency_loan: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    credit_card_loan: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    },
    shared_money: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 6.0
    }
}, {
    sequelize,
    modelName: 'GeneralSetting',
    tableName: 'general_settings',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
});

module.exports = GeneralSetting;
