const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CompulsoryDepositSetting = sequelize.define('CompulsoryDepositSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  annual_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Annual interest rate in percentage'
  },
  payment_interval: {
    type: DataTypes.ENUM('Daily', 'Monthly', 'Yearly'),
    defaultValue: 'Monthly',
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'compulsory_deposit_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CompulsoryDepositSetting;
