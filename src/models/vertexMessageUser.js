const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class VertexMessageUser extends Model {
    static associate(models) {
        VertexMessageUser.belongsTo(models.User, {
            foreignKey: 'user_id',
            targetKey: 'id',
            as: 'user'
        });
        VertexMessageUser.belongsTo(models.VertexMessage, {
            foreignKey: 'message_id',
            targetKey: 'id',
            as: 'message'
        });
    }
}

VertexMessageUser.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    message_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },        
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Read', 'Unread'),
        defaultValue: 'Unread',
        validate: {
            isIn: [['Read', 'Unread']]
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
    modelName: 'VertexMessageUser',
    tableName: 'vertex_message_users',
    timestamps: false
});

module.exports = VertexMessageUser;
