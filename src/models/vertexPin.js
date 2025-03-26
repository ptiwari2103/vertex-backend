const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class VertexPin extends Model {
  static associate(models) {
    VertexPin.belongsTo(models.User, {
      foreignKey: 'assigned_to',
      as: 'assignedUser'
    });
    VertexPin.belongsTo(models.User, {
      foreignKey: 'used_by',
      as: 'usedUser'
    });
  }
}

VertexPin.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pin_number: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true
  },
  assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
          model: 'Users',
          key: 'id'
      }
  },
  used_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
          model: 'Users',
          key: 'id'
      }
  },
  assigned_date: {
      type: DataTypes.DATE,
      allowNull: true
  },
  used_date: {
      type: DataTypes.DATE,
      allowNull: true
  },
}, {
    sequelize,
    modelName: 'VertexPin',
    tableName: 'vertex_pins',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date'
});

module.exports = VertexPin;
