const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Import models
const User = require('./user');
const Banner = require('./banner');
const City = require('./city');
const CarType = require('./carType');
const CarBrand = require('./carBrand');
const FAQ = require('./faq');
const Facility = require('./facility');
const Coupon = require('./coupon');
const Gallery = require('./gallery');
const Car = require('./car');

const models = {
    User,
    Banner,
    City,
    CarType,
    CarBrand,
    FAQ,
    Facility,
    Coupon,
    Gallery,
    Car,
};

// Define relationships

// One-to-Many: Car ↔ CarBrand
User.hasMany(Car, { foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Car.belongsTo(User, { foreignKey: 'userId' });
// One-to-One: CarType ↔ Gallery
CarType.hasOne(Gallery, { foreignKey: 'carTypeId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Gallery.belongsTo(CarType, { foreignKey: 'carTypeId' });

// One-to-Many: Car ↔ CarType
CarType.hasMany(Car, { foreignKey: 'carTypeId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Car.belongsTo(CarType, { foreignKey: 'carTypeId' });

// One-to-Many: Car ↔ CarBrand
CarBrand.hasMany(Car, { foreignKey: 'carBrandId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Car.belongsTo(CarBrand, { foreignKey: 'carBrandId' });



// One-to-Many: Car ↔ City
City.hasMany(Car, { foreignKey: 'carCityId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Car.belongsTo(City, { foreignKey: 'carCityId' });

// Many-to-Many: Car ↔ Facility (Automatically creates a junction table)
Car.belongsToMany(Facility, { through: 'CarFacilities', foreignKey: 'carId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Facility.belongsToMany(Car, { through: 'CarFacilities', foreignKey: 'facilityId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Sync database
sequelize.sync({ alter: true }).then(() => {
    console.log("All models were synchronized successfully.");
}).catch(err => {
    console.error("An error occurred while creating the tables:", err);
});

module.exports = {
    ...models,
    sequelize
};
