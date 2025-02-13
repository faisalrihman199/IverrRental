const path = require('path');
const fs = require('fs');
const { Car, User, CarType, CarBrand, City } = require("../models");

// Create or Update Car
const saveCar = async (req, res) => {
    try {
        const { id } = req.query;
        const { name, number,driverName,driverPhone,rating, status, seat, AC, gearSystem, carTypeId, carBrandId, carCityId, rentWithDriver, rentDriverLess, engineHP, priceType, fuelType, description, pickupAddress, latitude, longitude, drivenKM, minHrsReq } = req.body;
        const userId = req.user.id; // Extract userId from middleware
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "Car image is required." });
        }

        const imagePath = `/uploads/cars/${file.filename}`;

        let car;
        if (id) {
            // Update existing car
            car = await Car.findByPk(id);
            if (!car) {
                return res.status(404).json({ message: "Car not found." });
            }

            if (car.userId !== userId) {
                return res.status(403).json({ message: "You are not authorized to update this car." });
            }

            // Delete old image file
            if (car.image) {
                const oldImagePath = path.join(__dirname, `../public${car.image}`);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            await car.update({
                name,
                number,
                image: imagePath,
                status,
                seat,
                AC,
                driverName,driverPhone,rating,
                gearSystem,
                carTypeId,
                carBrandId,
                carCityId,
                rentWithDriver,
                rentDriverLess,
                engineHP,
                priceType,
                fuelType,
                description,
                pickupAddress,
                latitude,
                longitude,
                drivenKM,
                minHrsReq,
                userId
            });
            return res.status(200).json({ message: "Car updated successfully.", car });
        } else {
            // Insert new car
            car = await Car.create({
                name,
                number,
                image: imagePath,
                status,
                seat,
                AC,
                driverName,driverPhone,rating,
                gearSystem,
                carTypeId,
                carBrandId,
                carCityId,
                rentWithDriver,
                rentDriverLess,
                engineHP,
                priceType,
                fuelType,
                description,
                pickupAddress,
                latitude,
                longitude,
                drivenKM,
                minHrsReq,
                userId
            });
            return res.status(201).json({ message: "Car created successfully.", car });
        }
    } catch (error) {
        console.error("Error in saveCar:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Get Cars
const getCars = async (req, res) => {
    try {
        const { id, status, carTypeId, carBrandId, carCityId } = req.query;
        const userId = req.user.id; // Extract userId from middleware

        let whereClause = { }; // Only fetch user's cars

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;
        if (carTypeId) whereClause.carTypeId = carTypeId;
        if (carBrandId) whereClause.carBrandId = carBrandId;
        if (carCityId) whereClause.carCityId = carCityId;

        const cars = await Car.findAll({
            where: whereClause,
            include: [
                { model: CarType },
                { model: CarBrand },
                { model: City }
            ]
        });

        return res.status(200).json({ cars });
    } catch (error) {
        console.error("Error in getCars:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Delete Car
const deleteCar = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: "Car ID is required." });
        }

        const userId = req.user.id; // Extract userId from middleware
        const car = await Car.findByPk(id);

        if (!car) {
            return res.status(404).json({ message: "Car not found." });
        }

        if (car.userId !== userId && req.user.role!=='admin') {
            return res.status(403).json({ message: "You are not authorized to delete this car." });
        }

        // Delete the image file
        if (car.image) {
            const imagePath = path.join(__dirname, `../public${car.image}`);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await car.destroy();
        return res.status(200).json({ message: "Car deleted successfully." });
    } catch (error) {
        console.error("Error in deleteCar:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = {
    saveCar,
    getCars,
    deleteCar
};
