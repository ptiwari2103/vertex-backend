const { DataTypes, Model } = require('sequelize');
// const bcryptjs = require('bcryptjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');

class User extends Model {
    // Instance method for password validation
    async validatePassword(password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            console.error('Password validation error:', error);
            return false;
        }
    }

    // Instance method to get safe user data (excluding sensitive fields)
    toSafeObject() {
        const { password, ...safeData } = this.toJSON();
        return safeData;
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
            notEmpty: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            customValidation(value) {
                const strengthChecks = {
                    length: value.length >= 8,
                    uppercase: /[A-Z]/.test(value),
                    lowercase: /[a-z]/.test(value),
                    number: /[0-9]/.test(value),
                    special: /[!@#$%^&*(),.?":{}|<>]/.test(value)
                };
    
                const failedChecks = Object.entries(strengthChecks)
                    .filter(([_, passed]) => !passed)
                    .map(([key]) => key);
    
                if (failedChecks.length) {
                    throw new Error(`Password must include: ${failedChecks.join(', ')}`);
                }
            }
        }
    },
    user_type: {
        type: DataTypes.ENUM('admin', 'subadmin', 'member'),
        defaultValue: 'member',
        validate: {
            isIn: [['admin', 'subadmin', 'member']]
        }
    },
    user_id: {
        type: DataTypes.STRING(8),
        allowNull: false,
        unique: true,
        validate: {
            is: /^\d{6}$/i, // DDVXYZ format validation
            notEmpty: true
        }
    },
    account_number: {
        type: DataTypes.STRING(10),
        allowNull: true,
        unique: true
    },
    guardian_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true
    },
    gender: {
        type: DataTypes.ENUM('Male', 'Female', 'Transgender'),
        allowNull: true,
        validate: {
            isIn: [['Male', 'Female', 'Transgender']]
        }
    },
    mobile_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
        unique: true,
        validate: {
            is: /^[0-9]{10}$/i
        }
    },
    state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'states',
            key: 'id'
        }
    },
    district_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'districts',
            key: 'id'
        }
    },
    terms_accepted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    kyc_status: {
        type: DataTypes.ENUM('Pending', 'Submitted', 'Approved', 'Rejected'),
        defaultValue: 'Pending',
        validate: {
            isIn: [['Pending', 'Submitted', 'Approved', 'Rejected']]
        }
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Pending', 'Blocked'),
        defaultValue: 'Pending',
        validate: {
            isIn: [['Active', 'Inactive', 'Pending', 'Blocked']]
        }
    }
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

module.exports = User;