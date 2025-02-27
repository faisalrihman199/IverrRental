const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Booking = sequelize.define("Booking", {
    carId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Cars', // Name of the referenced table
            key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users', // Name of the referenced table
            key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isDriver: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    pickDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    pickTime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    returnDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    returnTime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
}, {
    timestamps: true,
});

module.exports = Booking;
