const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FixedDeposit = sequelize.define('FixedDeposit', {
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
  setting_id: {
    type: DataTypes.INTEGER,
    allowNull: true    
  },
  per_day_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Annual interest rate in percentage per day'
  },
  required_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Required amount'
  },
  payment_interval: {
    type: DataTypes.ENUM('Daily', 'Monthly', 'Yearly'),
    defaultValue: 'Monthly',
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transaction_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  }, 
  total_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  interest_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  penality_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  penality_paid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  deposit_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  maturity_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  interest_added: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Matured'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'fixed_deposits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = FixedDeposit;
