const { DataTypes, Model } = require('sequelize');
// const bcryptjs = require('bcryptjs');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

class User extends Model {

    static associate(models) {
        // One User has One Profile
        User.hasOne(models.Profile, { foreignKey: 'user_id', as: 'profile' });
        // One User has One UserBank
        User.hasOne(models.UserBank, { foreignKey: 'user_id', as: 'userBank' });
    }

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
    parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    address_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'user_addresses',
            key: 'id'
        }
    },
    bank_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'user_banks',
            key: 'id'
        }
    },
    pay_key: {
        type: DataTypes.STRING(8),
        allowNull: true,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    pay_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: 'pay_key'
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    email_id: {
        type: DataTypes.STRING(255),
        allowNull: true        
    },
    is_email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
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
    guardian_relation: {
        type: DataTypes.ENUM('Father', 'Mother', 'Guardian', 'Husband', 'Other'),
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
    is_mobile_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
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
    status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Pending', 'Blocked'),
        defaultValue: 'Pending',
        validate: {
            isIn: [['Active', 'Inactive', 'Pending', 'Blocked']]
        }
    },
    deleted_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    deleted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
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