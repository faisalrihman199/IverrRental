const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Car = sequelize.define("Car", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false,
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
        allowNull: false,
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
        allowNull: false,
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
    carCityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Cities",
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
        allowNull: false,
    },
    rentDriverLess: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    engineHP: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    priceType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    fuelType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    pickupAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    latitude: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    longitude: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    drivenKM: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    minHrsReq: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    timestamps: true,
});

module.exports = Car;
