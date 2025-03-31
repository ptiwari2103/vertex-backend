const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

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
  nominee_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  nominee_relation: {
    type: DataTypes.ENUM('Father', 'Mother', 'Brother', 'Sister','Wife', 'Husband', 'Son', 'Daughter'),
    allowNull: true,
    validate: {
      isIn: [['Father', 'Mother', 'Brother', 'Sister','Wife', 'Husband', 'Son', 'Daughter']]
    }
  },
  nominee_contact: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  nominee_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_divyang: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  divyang_certificate: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  is_senior_citizen: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_fanchise: {
    type: DataTypes.ENUM('Inactive', 'Active'),
    defaultValue: 'Inactive',
    validate: {
      isIn: [['Inactive', 'Active']]
    }
  },
  is_agent: {
    type: DataTypes.ENUM('Inactive', 'Active'),
    defaultValue: 'Inactive',
    validate: {
      isIn: [['Inactive', 'Active']]
    }
  },
  profile_image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pan_number: {
    type: DataTypes.STRING(12),
    allowNull: true
  },
  pan_number_image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  aadhar_number: {
    type: DataTypes.STRING(12),
    allowNull: true
  },
  aadhar_number_image_front: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  aadhar_number_image_back: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  kyc_status: {
    type: DataTypes.ENUM('Pending', 'Submitted', 'Approved', 'Rejected'),
    defaultValue: 'Pending',
    validate: {
      isIn: [['Pending', 'Submitted', 'Approved', 'Rejected']]
    }
  }
}, {
  sequelize,
  modelName: 'Profile',
  tableName: 'profiles',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});


module.exports = Profile;