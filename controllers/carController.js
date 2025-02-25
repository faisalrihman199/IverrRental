const fs = require('fs');
const path = require('path');
const { Car, User, CarType, CarBrand, City, sequelize } = require('../models'); // Ensure sequelize is exported

const saveCar = async (req, res) => {
    // Start a transaction
    const t = await sequelize.transaction();
    try {
        const { id } = req.query;
        const {
            name, number, driverName, driverPhone, rating, status, seat, AC, gearSystem,
            carTypeId, carBrandId, carCityId, rentWithDriver, rentDriverLess, engineHP,
            priceType, fuelType, description, pickupAddress, latitude, longitude, drivenKM, minHrsReq,
            facilities // Expected as either an array or a JSON string
        } = req.body;
        const userId = req.user.id; // Extract userId from middleware
        // For multiple image uploads, use req.files instead of req.file
        const files = req.files;

        if (!files || files.length === 0) {
            // Roll back and return error if no images are provided
            await t.rollback();
            return res.status(400).json({ success: false, message: "At least one car image is required." });
        }

        // Build an array of image paths
        const imagePaths = files.map(file => `/uploads/cars/${file.filename}`);
        // Convert the array to a JSON string so it can be stored in the "image" field
        const imagesJson = JSON.stringify(imagePaths);
        
        let car;

        if (id) {
            // Update existing car
            car = await Car.findByPk(id, { transaction: t });
            if (!car) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "Car not found." });
            }

            if (car.userId !== userId) {
                await t.rollback();
                return res.status(403).json({ success: false, message: "You are not authorized to update this car." });
            }

            // Delete old image files if new images are provided
            // (Assumes the old images are stored as a JSON string in the "image" field)
            if (car.image) {
                try {
                    const oldImagePaths = JSON.parse(car.image);
                    oldImagePaths.forEach(image => {
                        const oldImagePath = path.join(__dirname, `../public${image}`);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    });
                } catch (err) {
                    console.error("Error parsing old image paths:", err);
                }
            }

            await car.update({
                name,
                number,
                image: imagesJson,
                status,
                seat,
                AC,
                driverName,
                driverPhone,
                rating,
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
            }, { transaction: t });
        } else {
            // Create new car
            car = await Car.create({
                name,
                number,
                image: imagesJson,
                status,
                seat,
                AC,
                driverName,
                driverPhone,
                rating,
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
            }, { transaction: t });
        }

        // Process facilities: if sent as a JSON string, parse it.
        let facilitiesArray = facilities;
        if (facilities && typeof facilities === 'string') {
            try {
                facilitiesArray = JSON.parse(facilities);
            } catch (err) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Invalid facilities format." });
            }
        }

        // If facilitiesArray is valid and is an array, update the many-to-many association
        if (facilitiesArray && Array.isArray(facilitiesArray)) {
            console.log("Setting facilities:", facilitiesArray);
            await car.setFacilities(facilitiesArray, { transaction: t });
        }

        // Commit the transaction if everything succeeded
        await t.commit();

        if (id) {
            return res.status(200).json({ success: true, message: "Car updated successfully.", car });
        } else {
            return res.status(201).json({ success: true, message: "Car created successfully.", car });
        }
    } catch (error) {
        // Roll back the transaction on error
        await t.rollback();
        console.error("Error in saveCar:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getCars = async (req, res) => {
    try {
        const { id, status, carTypeId, carBrandId, carCityId } = req.query;
        const userId = req.user.id; // Extract userId from middleware

        let whereClause = {}; // Build filter conditions

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;
        if (carTypeId) whereClause.carTypeId = carTypeId;
        if (carBrandId) whereClause.carBrandId = carBrandId;
        if (carCityId) whereClause.carCityId = carCityId;

        // Optionally filter by userId if needed
        // whereClause.userId = userId;

        const cars = await Car.findAll({
            where: whereClause,
            include: [
                { model: CarType },
                { model: CarBrand },
                { model: City }
            ]
        });

        return res.status(200).json({ success: true, cars });
    } catch (error) {
        console.error("Error in getCars:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCar = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: "Car ID is required." });
        }

        const userId = req.user.id; // Extract userId from middleware
        const car = await Car.findByPk(id);

        if (!car) {
            return res.status(404).json({ success: false, message: "Car not found." });
        }

        if (car.userId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "You are not authorized to delete this car." });
        }

        // Delete all associated image files (assuming "image" is a JSON string of an array)
        if (car.image) {
            try {
                const imagePaths = JSON.parse(car.image);
                imagePaths.forEach(image => {
                    const imagePath = path.join(__dirname, `../public${image}`);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                });
            } catch (err) {
                console.error("Error parsing image paths for deletion:", err);
            }
        }

        await car.destroy();
        return res.status(200).json({ success: true, message: "Car deleted successfully." });
    } catch (error) {
        console.error("Error in deleteCar:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    saveCar,
    getCars,
    deleteCar
};
