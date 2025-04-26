const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ReferralSetting extends Model {}

ReferralSetting.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    shared_money: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 500
    },
    compulsory_deposit: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 300
    },
    admission_fee: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 200
    },
    building_fund: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100
    },
    welfare_fund: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100
    },
    other_deposit: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 400
    }
}, {
    sequelize,
    modelName: 'ReferralSetting',
    tableName: 'referral_settings',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
});

module.exports = ReferralSetting;
