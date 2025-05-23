const fs = require('fs');
const path = require('path');
const { CarBrand } = require("../models");

// Save (Insert/Update) Car Brand
const saveCarBrand = async (req, res) => {
    try {
        const { id } = req.query;
        // In creation, title is required. In updates, title is optional.
        const { title, status } = req.body;
        const file = req.file;

        // For creation, ensure title is provided.
        if (!id && !title) {
            return res.status(400).json({ success: false, message: "Car brand title is required." });
        }

        let imagePath;
        if (file) {
            imagePath = `/uploads/car_brands/${file.filename}`;
        }
        let carBrand;
        if (id) {
            // Update existing car brand
            carBrand = await CarBrand.findByPk(id);
            if (!carBrand) {
                return res.status(404).json({ success: false, message: "Car brand not found." });
            }

            // Build the update data dynamically
            let updateData = {};
            if (title !== undefined) {
                updateData.title = title;
            }
            if (status !== undefined) {
                updateData.status = status;
            }
            if (imagePath) {
                // Delete the old image file if it exists
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
                updateData.image = imagePath;
            }

            await carBrand.update(updateData);
            return res.status(200).json({ success: true, message: "Car brand updated successfully.", carBrand });
        } else {
            // Insert new car brand
            let newData = { title };
            if (status !== undefined) {
                newData.status = status;
            }
            if (imagePath) {
                newData.image = imagePath;
            }

            carBrand = await CarBrand.create(newData);
            return res.status(201).json({ success: true, message: "Car brand created successfully.", carBrand });
        }
    } catch (error) {
        console.error("Error in saveCarBrand:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
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
        return res.status(200).json({ success: true, data:carBrands });
    } catch (error) {
        console.error("Error in getCarBrands:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Delete Car Brand and Remove Image File
const deleteCarBrand = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: "Car brand ID is required." });
        }

        const carBrand = await CarBrand.findByPk(id);
        if (!carBrand) {
            return res.status(404).json({ success: false, message: "Car brand not found." });
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
        return res.status(200).json({ success: true, message: "Car brand deleted successfully." });
    } catch (error) {
        console.error("Error in deleteCarBrand:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    saveCarBrand,
    getCarBrands,
    deleteCarBrand
};
