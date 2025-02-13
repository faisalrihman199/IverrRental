const fs = require('fs');
const path = require('path');
const { CarType } = require("../models");

// Save (Insert/Update) Car Type
const saveCarType = async (req, res) => {
    try {
        const { id } = req.query;
        const { title, status } = req.body;  // Changed name to title
        const file = req.file;

        if (!title) {
            return res.status(400).json({ message: "Car type title is required." });  // Changed name to title
        }

        let imagePath = null;
        if (file) {
            imagePath = `/uploads/car_types/${file.filename}`;
        }

        let carType;
        if (id) {
            // Update existing car type
            carType = await CarType.findByPk(id);
            if (!carType) {
                return res.status(404).json({ message: "Car type not found." });
            }

            // Delete the old image file
            if (carType.image) {
                const oldImagePath = path.join(__dirname, `../public${carType.image}`);
                console.log(`Trying to delete: ${oldImagePath}`);

                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log("Old image deleted successfully.");
                } else {
                    console.log("Old image file not found.");
                }
            }

            await carType.update({ title, image: imagePath, status });  // Changed name to title
            return res.status(200).json({ message: "Car type updated successfully.", carType });
        } else {
            // Insert new car type
            carType = await CarType.create({ title, image: imagePath, status });  // Changed name to title
            return res.status(201).json({ message: "Car type created successfully.", carType });
        }
    } catch (error) {
        console.error("Error in saveCarType:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Get All Car Types
const getCarTypes = async (req, res) => {
    try {
        const { id, status } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;

        const carTypes = await CarType.findAll({ where: whereClause });
        return res.status(200).json({ carTypes });
    } catch (error) {
        console.error("Error in getCarTypes:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Delete Car Type and Remove Image File
const deleteCarType = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: "Car type ID is required." });
        }

        const carType = await CarType.findByPk(id);
        if (!carType) {
            return res.status(404).json({ message: "Car type not found." });
        }

        // Delete the image file
        if (carType.image) {
            const imagePath = path.join(__dirname, `../public${carType.image}`);
            console.log(`Trying to delete: ${imagePath}`);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log("Image deleted successfully.");
            } else {
                console.log("Image file not found.");
            }
        }

        await carType.destroy(); // Soft delete if paranoid mode is enabled
        return res.status(200).json({ message: "Car type deleted successfully." });
    } catch (error) {
        console.error("Error in deleteCarType:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = {
    saveCarType,
    getCarTypes,
    deleteCarType
};
