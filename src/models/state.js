const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class State extends Model {}

State.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    }
}, {
    sequelize,
    modelName: 'State',
    tableName: 'states',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date'
});

module.exports = State;
