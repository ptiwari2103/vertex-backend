const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class VertexMessage extends Model {
    static associate(models) {
        VertexMessage.belongsTo(models.User, {
            foreignKey: 'created_by',
            targetKey: 'id',
            as: 'createdUser'
        });
    }
}

VertexMessage.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    subject: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    image: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    created_by: {
        type: DataTypes.STRING,
        allowNull: false
    },
    populate_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    send_to: {
        type: DataTypes.JSON,
    allowNull: false
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
    modelName: 'VertexMessage',
    tableName: 'vertex_messages',
    timestamps: true
});

module.exports = VertexMessage;
