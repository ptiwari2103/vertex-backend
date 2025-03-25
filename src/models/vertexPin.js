const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VertexPin = sequelize.define('VertexPin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pin: {
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
    created_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    assigned_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    used_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('available', 'assigned', 'used'),
        defaultValue: 'available'
    }
}, {
    tableName: 'vertex_pins',
    timestamps: false
});

module.exports = VertexPin;