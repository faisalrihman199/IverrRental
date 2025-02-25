const fs = require('fs');
const path = require('path');
const { Gallery, CarType } = require("../models");

// Save (Insert/Update) Gallery Image
const saveGalleryImage = async (req, res) => {
    try {
        const { id } = req.query;
        const { carTypeId } = req.body; // No title or description now
        const files = req.files; // Using req.files for multiple image uploads

        if (!carTypeId) {
            return res.status(400).json({ success: false, message: "Car type ID is required." });
        }
        
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "At least one image is required." });
        }
        
        // Build an array of image paths and convert to JSON string for storage
        const imagePaths = files.map(file => `/uploads/gallery/${file.filename}`);
        const imagesJson = JSON.stringify(imagePaths);

        // Validate carTypeId
        const carType = await CarType.findByPk(carTypeId);
        if (!carType) {
            return res.status(404).json({ success: false, message: "Car type not found." });
        }

        let galleryImage;
        if (id) {
            // Update existing gallery image record
            galleryImage = await Gallery.findByPk(id);
            if (!galleryImage) {
                return res.status(404).json({ success: false, message: "Gallery image not found." });
            }

            // Delete old image files if they exist
            if (galleryImage.image) {
                let oldImages;
                try {
                    oldImages = JSON.parse(galleryImage.image);
                } catch (err) {
                    oldImages = [];
                }
                oldImages.forEach(imgPath => {
                    const fullImagePath = path.join(__dirname, `../public${imgPath}`);
                    if (fs.existsSync(fullImagePath)) {
                        fs.unlinkSync(fullImagePath);
                    }
                });
            }

            await galleryImage.update({ carTypeId, image: imagesJson });
            return res.status(200).json({ success: true, message: "Gallery image updated successfully.", galleryImage });
        } else {
            // Insert new gallery image record
            galleryImage = await Gallery.create({ carTypeId, image: imagesJson });
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

// Delete Gallery Image and Remove Image Files
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

        // Delete all associated image files
        if (galleryImage.image) {
            let imageArray;
            try {
                imageArray = JSON.parse(galleryImage.image);
            } catch (err) {
                imageArray = [];
            }
            imageArray.forEach(imgPath => {
                const fullImagePath = path.join(__dirname, `../public${imgPath}`);
                if (fs.existsSync(fullImagePath)) {
                    fs.unlinkSync(fullImagePath);
                }
            });
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
