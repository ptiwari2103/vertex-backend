const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Agent extends Model {
  static associate(models) {
    Agent.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

Agent.init({
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
  status: {
    type: DataTypes.ENUM('Pending', 'Approved'),
    defaultValue: 'Pending',
    validate: {
      isIn: [['Pending', 'Approved']]
    }
  },
  approved_date: {
    type: DataTypes.DATE,
    allowNull: true
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
  modelName: 'Agent',
  tableName: 'agents',
  timestamps: false
});


module.exports = Agent;