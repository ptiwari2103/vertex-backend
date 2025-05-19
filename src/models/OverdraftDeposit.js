const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OverdraftDeposit = sequelize.define('OverdraftDeposit', {
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
  type: {
    type: DataTypes.ENUM('CD','RD','FD','Other'),
    defaultValue: 'Other',
    allowNull: false
  },
  type_id: {
    type: DataTypes.INTEGER,
    allowNull: true    
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
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
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'overdraft_deposits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = OverdraftDeposit;
