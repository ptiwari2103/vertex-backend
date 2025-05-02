const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Card extends Model {
  static associate(models) {
    Card.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

Card.init({
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
  card_number: {
    type: DataTypes.STRING(50),
    allowNull: true 
  },
  expiry_month: {
    type: DataTypes.TINYINT,
    allowNull: true
  },
  expiry_year: {
    type: DataTypes.SMALLINT,
    allowNull: true
  },
  cvv_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  assigned_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  card_limit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  current_balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  first_tx: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Blocked'),
    defaultValue: 'Pending',
    validate: {
      isIn: [['Pending', 'Approved', 'Rejected', 'Blocked']]
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
  modelName: 'Card',
  tableName: 'cards',
  timestamps: false
});


module.exports = Card;