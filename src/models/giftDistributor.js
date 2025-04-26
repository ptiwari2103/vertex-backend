const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class GiftDistributor extends Model {
  static associate(models) {
    GiftDistributor.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }  
}

GiftDistributor.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tmp_user: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  login_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING(255),
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
  modelName: 'GiftDistributor',
  tableName: 'gift_distributors',
  timestamps: false
});


module.exports = GiftDistributor;