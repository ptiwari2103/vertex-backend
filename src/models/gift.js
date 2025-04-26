const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Gift extends Model {
  
}

Gift.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true 
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false 
  },
  used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: true 
  },
  remaining: {
    type: DataTypes.INTEGER,
    allowNull: false 
  },
  status: {
    type: DataTypes.ENUM('Inactive', 'Active'),
    defaultValue: 'Inactive',
    validate: {
      isIn: [['Inactive', 'Active']]
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
},
updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
}
}, {
  sequelize,
  modelName: 'Gift',
  tableName: 'gifts',
  timestamps: false
});


module.exports = Gift;