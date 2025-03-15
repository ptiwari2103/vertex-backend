const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Profile extends Model {
    static associate(models) {
      Profile.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  Profile.init({
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
    email_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    pan_no: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true
    },
    pan_front_image: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    pan_back_image: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    aadhar_no: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true
    },
    aadhar_front_image: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    aadhar_back_image: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    profile_image: {
      type: DataTypes.STRING(255),
      allowNull: false
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
    modelName: 'Profile',
    tableName: 'Profile',
    timestamps: false
  });

  return Profile;
};
