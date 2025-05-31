const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Car = sequelize.define("Car", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    model: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    image: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    rating: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    seat: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    AC: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    driverName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    driverPhone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    gearSystem: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    carTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "CarTypes",
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
    },
    carBrandId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "CarBrands",
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
    },
    rentWithDriver: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    rentDriverLess: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    engineHP: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    priceType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    fuelType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    locationInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    pickupAddress: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    latitude: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    longitude: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    drivenKM: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    minHrsReq: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    freeCancellation: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    paymentAccepted: {
        type: DataTypes.TEXT,
        allowNull: true,
    },


}, {
    timestamps: true,
});

module.exports = Car;
