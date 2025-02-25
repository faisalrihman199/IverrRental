const fs = require('fs');
const path = require('path');
const { Gallery, CarType } = require("../models");

// Save (Insert/Update) Gallery Image
const saveGalleryImage = async (req, res) => {
    try {
        const { id } = req.query;
        const { carTypeId } = req.body; // No title or description now
        const file = req.file;

        if (!carTypeId) {
            return res.status(400).json({ success: false, message: "Car type ID is required." });
        }

        let imagePath = null;
        if (file) {
            imagePath = `/uploads/gallery/${file.filename}`;
        }

        // Validate carTypeId
        const carType = await CarType.findByPk(carTypeId);
        if (!carType) {
            return res.status(404).json({ success: false, message: "Car type not found." });
        }

        let galleryImage;
        if (id) {
            // Update existing gallery image
            galleryImage = await Gallery.findByPk(id);
            if (!galleryImage) {
                return res.status(404).json({ success: false, message: "Gallery image not found." });
            }

            // Delete the old image file
            if (galleryImage.image) {
                const oldImagePath = path.join(__dirname, `../public${galleryImage.image}`);
                console.log(`Trying to delete: ${oldImagePath}`);

                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log("Old image deleted successfully.");
                } else {
                    console.log("Old image file not found.");
                }
            }

            await galleryImage.update({ carTypeId, image: imagePath });
            return res.status(200).json({ success: true, message: "Gallery image updated successfully.", galleryImage });
        } else {
            // Insert new gallery image
            galleryImage = await Gallery.create({ carTypeId, image: imagePath });
            return res.status(201).json({ success: true, message: "Gallery image created successfully.", galleryImage });
        }
    } catch (error) {
        console.error("Error in saveGalleryImage:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Get All Gallery Images
const getGalleryImages = async (req, res) => {
    try {
        const { id, carTypeId } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (carTypeId) whereClause.carTypeId = carTypeId;

        const galleryImages = await Gallery.findAll({ where: whereClause });
        return res.status(200).json({ success: true, galleryImages });
    } catch (error) {
        console.error("Error in getGalleryImages:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Delete Gallery Image and Remove Image File
const deleteGalleryImage = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: "Gallery image ID is required." });
        }

        const galleryImage = await Gallery.findByPk(id);
        if (!galleryImage) {
            return res.status(404).json({ success: false, message: "Gallery image not found." });
        }

        // Delete the image file
        if (galleryImage.image) {
            const imagePath = path.join(__dirname, `../public${galleryImage.image}`);
            console.log(`Trying to delete: ${imagePath}`);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log("Image deleted successfully.");
            } else {
                console.log("Image file not found.");
            }
        }

        await galleryImage.destroy(); // Soft delete if paranoid mode is enabled
        return res.status(200).json({ success: true, message: "Gallery image deleted successfully." });
    } catch (error) {
        console.error("Error in deleteGalleryImage:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    saveGalleryImage,
    getGalleryImages,
    deleteGalleryImage
};
