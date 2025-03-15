const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserBank extends Model {
    static associate(models) {
      UserBank.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  UserBank.init({
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
    account_holder: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    account_no: {
      type: DataTypes.BIGINT(20),
      allowNull: false,
      unique: true
    },
    bank_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ifsc_number: {
      type: DataTypes.STRING(11),
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT(1),
      allowNull: false,
      defaultValue: 1
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'UserBank',
    tableName: 'user_banks',
    timestamps: false
  });

  return UserBank;
};
