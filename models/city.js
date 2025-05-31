// city.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class City extends Model {}

City.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lat: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    long: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'City',
    paranoid: true, // Optional, if you want soft deletes
});

module.exports = City;
