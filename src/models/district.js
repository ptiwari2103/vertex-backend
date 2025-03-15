const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const State = require('./state');

class District extends Model {}

District.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    state_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'states',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'District',
    tableName: 'districts',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['name', 'state_id'],
            name: 'districts_name_state_id'
        }
    ]
});

module.exports = District;
