const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Gallery = sequelize.define("Gallery", {
    image:{
        type:DataTypes.TEXT,
        allowNull: false,
    },
    carId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Cars', // Name of the referenced table
            key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE', // Updates foreign key on referenced table changes
        onDelete: 'CASCADE', // Deletes associated customer if the user is deleted
    },
}, {
    timestamps: true, 
});

module.exports = Gallery;
