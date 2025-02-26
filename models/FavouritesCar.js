const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FavouritesCar = sequelize.define("FavouritesCar", {
    carId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Cars', // Reference to your Cars table/model
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users', // Reference to your Users table/model
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    }
}, {
    timestamps: true, // Enable timestamps if you want createdAt and updatedAt fields
});

module.exports = FavouritesCar;
