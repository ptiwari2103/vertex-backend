const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class GiftReceived extends Model {

}

GiftReceived.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    gift_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    distributor_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
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
    modelName: 'GiftReceived',
    tableName: 'gift_received',
    timestamps: false
});


module.exports = GiftReceived;