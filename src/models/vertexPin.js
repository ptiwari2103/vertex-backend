const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class VertexPin extends Model {
    static associate(models) {
        VertexPin.belongsTo(models.User, {
            foreignKey: 'assigned_to',
            targetKey: 'id',
            as: 'assignedUser'
        });
        VertexPin.belongsTo(models.User, {
            foreignKey: 'used_by',
            targetKey: 'id',
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
    pin: {
        type: DataTypes.STRING(8),
        allowNull: false,
        unique: true
    },
    assigned_to: {
        type: DataTypes.STRING,
        allowNull: true
    },
    used_by: {
        type: DataTypes.STRING,
        allowNull: true
    },
    assigned_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    used_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'VertexPin',
    tableName: 'vertex_pins',
    timestamps: false
});

module.exports = VertexPin;
