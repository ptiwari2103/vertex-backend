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
    defaultValue: 0.00
  },
  payment_interval: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  penality_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total_principal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  total_interest: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  total_penality: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  total_net_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  is_active: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '0=>Inactive, 1=>Active, 2=>Closed'
  },
  settlement_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  settlement_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'recurring_deposit_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RecurringDepositSetting;
