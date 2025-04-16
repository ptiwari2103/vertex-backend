const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserAddress extends Model {
  static associate(models) {
    UserAddress.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    // Associations for permanent address
    UserAddress.belongsTo(models.State, {
      foreignKey: 'permanent_state_id',
      as: 'permanentState'
    });
    
    UserAddress.belongsTo(models.District, {
      foreignKey: 'permanent_district_id',
      as: 'permanentDistrict'
    });
    
    // Associations for correspondence address
    UserAddress.belongsTo(models.State, {
      foreignKey: 'correspondence_state_id',
      as: 'correspondenceState'
    });
    
    UserAddress.belongsTo(models.District, {
      foreignKey: 'correspondence_district_id',
      as: 'correspondenceDistrict'
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
  permanent_city: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  permanent_state_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: 'states',
        key: 'id'
    }
},
permanent_district_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: 'districts',
        key: 'id'
    }
},
  permanent_pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },

  correspondence_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  correspondence_city: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  correspondence_state_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: 'states',
        key: 'id'
    }
  },
correspondence_district_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: 'districts',
        key: 'id'
    }
},
  correspondence_pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  is_same_address: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
