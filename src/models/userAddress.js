const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserAddress extends Model {
  static associate(models) {
    UserBank.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

UserAddress.init({
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
  permanent_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permanent_state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  permanent_district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  permanent_pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },

  correspondence_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  correspondence_state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  correspondence_district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  correspondence_pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Inactive', 'Active'),
    defaultValue: 'Inactive',
    validate: {
      isIn: [['Inactive', 'Active']]
    }
  }

}, {
  sequelize,
  modelName: 'UserAddress',
  tableName: 'user_addresses',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

module.exports = UserAddress;


