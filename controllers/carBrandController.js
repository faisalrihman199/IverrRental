const fs = require('fs');
const path = require('path');
const { CarBrand } = require("../models");

// Save (Insert/Update) Car Brand
const saveCarBrand = async (req, res) => {
    try {
        const { id } = req.query;
        const { title, status } = req.body;
        const file = req.file;

        if (!title) {
            return res.status(400).json({ message: "Car brand title is required." });
        }

        let imagePath = null;
        if (file) {
            imagePath = `/uploads/car_brands/${file.filename}`;
        }

        let carBrand;
        if (id) {
            // Update existing car brand
            carBrand = await CarBrand.findByPk(id);
            if (!carBrand) {
                return res.status(404).json({ message: "Car brand not found." });
            }

            // Delete the old image file
            if (carBrand.image) {
                const oldImagePath = path.join(__dirname, `../public${carBrand.image}`);
                console.log(`Trying to delete: ${oldImagePath}`);

                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log("Old image deleted successfully.");
                } else {
                    console.log("Old image file not found.");
                }
            }

            await carBrand.update({ title, image: imagePath, status });
            return res.status(200).json({ message: "Car brand updated successfully.", carBrand });
        } else {
            // Insert new car brand
            carBrand = await CarBrand.create({ title, image: imagePath, status });
            return res.status(201).json({ message: "Car brand created successfully.", carBrand });
        }
    } catch (error) {
        console.error("Error in saveCarBrand:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Get All Car Brands
const getCarBrands = async (req, res) => {
    try {
        const { id, status } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;

        const carBrands = await CarBrand.findAll({ where: whereClause });
        return res.status(200).json({ carBrands });
    } catch (error) {
        console.error("Error in getCarBrands:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Delete Car Brand and Remove Image File
const deleteCarBrand = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: "Car brand ID is required." });
        }

        const carBrand = await CarBrand.findByPk(id);
        if (!carBrand) {
            return res.status(404).json({ message: "Car brand not found." });
        }

        // Delete the image file
        if (carBrand.image) {
            const imagePath = path.join(__dirname, `../public${carBrand.image}`);
            console.log(`Trying to delete: ${imagePath}`);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log("Image deleted successfully.");
            } else {
                console.log("Image file not found.");
            }
        }

        await carBrand.destroy(); // Soft delete if paranoid mode is enabled
        return res.status(200).json({ message: "Car brand deleted successfully." });
    } catch (error) {
        console.error("Error in deleteCarBrand:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = {
    saveCarBrand,
    getCarBrands,
    deleteCarBrand
};
