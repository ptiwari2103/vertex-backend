const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecurringDepositSetting = sequelize.define('RecurringDepositSetting', {
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
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  penality_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1.00
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'recurring_deposit_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RecurringDepositSetting;
