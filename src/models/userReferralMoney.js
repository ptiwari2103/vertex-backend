const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserReferralMoney extends Model {
    static associate(models) {
        UserReferralMoney.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    }
}

UserReferralMoney.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    pay_key: {
        type: DataTypes.STRING(8),
        allowNull: false
    },
    shared_money: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    compulsory_deposit: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    admission_fee: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    building_fund: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    welfare_fund: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    other_deposit: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'UserReferralMoney',
    tableName: 'user_referral_money',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
});

module.exports = UserReferralMoney;
