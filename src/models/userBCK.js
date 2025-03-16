const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const State = require('./state');
const District = require('./district');

class User extends Model {
  static associate(models) {
    // Relationships with State and District
    User.belongsTo(State, {
      foreignKey: 'state',
      as: 'stateDetails'
    });
    User.belongsTo(District, {
      foreignKey: 'district',
      as: 'districtDetails'
    });
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50],
      is: /^[A-Za-z\s]+$/,
      notEmpty: true,
      customValidator(value) {
        if (value.trim().split(' ').length < 2) {
          throw new Error('Full name (first and last name) is required');
        }
      }
    }
  },
  guardian_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50],
      is: /^[A-Za-z\s]+$/,
      notEmpty: true,
      customValidator(value) {
        if (value.trim().split(' ').length < 2) {
          throw new Error('Full guardian name (first and last name) is required');
        }
      }
    }
  },
  // email: {
  //   type: DataTypes.STRING(100),
  //   allowNull: false,
  //   unique: true,
  //   validate: {
  //     isEmail: true,
  //     len: [6, 100],
  //     notEmpty: true
  //   }
  // },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      validatePassword(value) {
        // Skip validation for already hashed passwords (bcrypt)
        if (value.startsWith('$2')) return;

        // Password length validation (8-50 characters)
        if (value.length < 8 || value.length > 50) {
          throw new Error('Password must be between 8 and 50 characters');
        }

        // Must contain uppercase letter
        if (!/[A-Z]/.test(value)) {
          throw new Error('Password must contain at least one uppercase letter');
        }

        // Must contain lowercase letter
        if (!/[a-z]/.test(value)) {
          throw new Error('Password must contain at least one lowercase letter');
        }

        // Must contain number
        if (!/\d/.test(value)) {
          throw new Error('Password must contain at least one number');
        }

        // Must contain special character from allowed set
        if (!/[!@#$%^&*]/.test(value)) {
          throw new Error('Password must contain at least one special character (!@#$%^&*)');
        }

        // Cannot contain same character repeated more than twice
        if (/(.)\1{2}/.test(value)) {
          throw new Error('Password cannot contain same character repeated more than twice in a row');
        }
      }
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      customValidator(value) {
        const dob = new Date(value);
        const now = new Date();
        const age = now.getFullYear() - dob.getFullYear();
        if (age < 18) {
          throw new Error('Must be at least 18 years old');
        }
        if (dob.getFullYear() < 1900) {
          throw new Error('Year must be 1900 or later');
        }
        if (dob > now) {
          throw new Error('Cannot be a future date');
        }
      }
    }
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'transgender'),
    allowNull: false
  },
  mobile_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\d{10}$/,
      notEmpty: true,
      customValidator(value) {
        if (/^(.)\1{7,}$/.test(value)) {
          throw new Error('Cannot have more than 7 repeating digits');
        }
        if (/^(?:0123456789|9876543210)$/.test(value)) {
          throw new Error('Cannot be sequential numbers');
        }
      }
    }
  },
  // address: {
  //   type: DataTypes.STRING(200),
  //   allowNull: false,
  //   validate: {
  //     len: [10, 200],
  //     is: /^[a-zA-Z0-9\s,.\-#\/]+$/,
  //     notEmpty: true,
  //     customValidator(value) {
  //       if (!value.includes(',')) {
  //         throw new Error('Must include street address and area/locality, separated by commas');
  //       }
  //     }
  //   }
  // },
  // city: {
  //   type: DataTypes.STRING(50),
  //   allowNull: false,
  //   validate: {
  //     len: [2, 50],
  //     is: /^[A-Za-z\s]+$/,
  //     notEmpty: true
  //   }
  // },
  // pincode: {
  //   type: DataTypes.STRING(6),
  //   allowNull: false,
  //   validate: {
  //     is: /^[1-9]\d{5}$/,
  //     notEmpty: true
  //   }
  // },
  state: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'states',
      key: 'id'
    },
    validate: {
      min: 1
    }
  },
  district: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'districts',
      key: 'id'
    },
    validate: {
      min: 1
    }
  },
  user_type: {
    type: DataTypes.ENUM('member', 'admin', 'subadmin'),
    allowNull: false,
    defaultValue: 'member'
  },
  user_id: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\d{6}$/,
      notEmpty: true
    }
  },
  account_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\d{10}$/,
      notEmpty: true
    }
  },
  terms_accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    validate: {
      isTrue(value) {
        if (!value) {
          throw new Error('Terms and conditions must be accepted');
        }
      }
    }
  },
  kyc_status: {
    type: DataTypes.ENUM('Pending', 'Submitted', 'Approved', 'Rejected'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  aadhar_number: {
    type: DataTypes.STRING(12),
    allowNull: true,
    unique: true,
    validate: {
      is: /^\d{12}$/
    }
  },
  pan_number: {
    type: DataTypes.STRING(10),
    allowNull: true,
    unique: true,
    validate: {
      is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    }
  },
  aadhar_front_path: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  aadhar_back_path: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pan_front_path: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  kyc_submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Pending', 'Blocked'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  created_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

module.exports = User;
