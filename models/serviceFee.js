// city.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class ServiceFee extends Model {}
ServiceFee.init({
    fee: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'ServiceFee',
    paranoid: true, 
});

module.exports = ServiceFee;
