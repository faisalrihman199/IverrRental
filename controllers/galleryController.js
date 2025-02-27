const fs = require('fs');
const path = require('path');
const sequelize = require("../config/db"); // ensure sequelize is imported for transactions
// Import Gallery and Car models
const { Gallery, Car } = require("../models");

// Helper to parse image field
const parseGalleryImage = (gallery) => {
  const galleryObj = gallery.toJSON();
  try {
    galleryObj.image = galleryObj.image ? JSON.parse(galleryObj.image) : [];
  } catch (err) {
    galleryObj.image = [];
  }
  return galleryObj;
};

// Save (Insert/Update) Gallery Image
const saveGalleryImage = async (req, res) => {
    try {
        const { id } = req.query;
        const { carId } = req.body; // Changed from carTypeId to carId
        const files = req.files; // Using req.files for multiple image uploads

        if (!carId) {
            return res.status(400).json({ success: false, message: "Car ID is required." });
        }
        
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "At least one image is required." });
        }
        
        // Build an array of image paths and convert to JSON string for storage
        const imagePaths = files.map(file => `/uploads/gallery/${file.filename}`);
        const imagesJson = JSON.stringify(imagePaths);

        // Validate carId
        const car = await Car.findByPk(carId);
        if (!car) {
            return res.status(404).json({ success: false, message: "Car not found." });
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

            await galleryImage.update({ carId, image: imagesJson });
            const updatedGallery = parseGalleryImage(galleryImage);
            return res.status(200).json({ success: true, message: "Gallery image updated successfully.", galleryImage: updatedGallery });
        } else {
            // Insert new gallery image record
            galleryImage = await Gallery.create({ carId, image: imagesJson });
            const newGallery = parseGalleryImage(galleryImage);
            return res.status(201).json({ success: true, message: "Gallery image created successfully.", galleryImage: newGallery });
        }
    } catch (error) {
        console.error("Error in saveGalleryImage:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const getGalleryImages = async (req, res) => {
    try {
        const { id, carId } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (carId) whereClause.carId = carId;

        // Make sure Car is imported, e.g.,
        // const Car = require('../models/Car');

        const galleryImages = await Gallery.findAll({
            where: whereClause,
            include: [{
                model: Car,
                attributes: ['name'] // Only fetch the car's name
            }]
        });

        const parsedGalleryImages = galleryImages.map(gallery => {
            const galleryObj = gallery.toJSON();
            let images = [];
            try {
                // Parse the stringified JSON array
                images = JSON.parse(galleryObj.image);
            } catch (error) {
                images = [];
            }
            return {
                id: galleryObj.id,
                name: galleryObj.Car ? galleryObj.Car.name.trim() : null,
                image: images.length > 0 ? images[0] : null,
                carId: galleryObj.carId,
                images: images
            };
        });

        return res.status(200).json({ success: true, data: parsedGalleryImages });
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

const addGalleryImages = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.query;
      if (!id) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Gallery id is required." });
      }
      const gallery = await Gallery.findByPk(id, { transaction: t });
      if (!gallery) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Gallery not found." });
      }
      let existingImages = [];
      if (gallery.image) {
        try {
          existingImages = JSON.parse(gallery.image);
        } catch (err) {
          existingImages = [];
        }
      }
      const files = req.files;
      if (!files || files.length === 0) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "No new images provided." });
      }
      const newImagePaths = files.map(file => `/uploads/gallery/${file.filename}`);
      const updatedImages = existingImages.concat(newImagePaths);
      gallery.image = JSON.stringify(updatedImages);
      await gallery.save({ transaction: t });
      await t.commit();
      // Return the parsed image array
      return res.status(200).json({ success: true, message: "Gallery images added successfully", images: updatedImages });
    } catch (error) {
      await t.rollback();
      console.error("Error in addGalleryImages:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
};
  
// Function to remove an image from a gallery
const removeGalleryImage = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id, remove } = req.query;
      if (!id || !remove) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Gallery id and image identifier are required." });
      }
      const gallery = await Gallery.findByPk(id, { transaction: t });
      if (!gallery) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Gallery not found." });
      }
      let existingImages = [];
      if (gallery.image) {
        try {
          existingImages = JSON.parse(gallery.image);
        } catch (err) {
          existingImages = [];
        }
      }
      const updatedImages = existingImages.filter(imgPath => path.basename(imgPath) !== remove);
      const removedImages = existingImages.filter(imgPath => path.basename(imgPath) === remove);
      removedImages.forEach(imgPath => {
        const fullPath = path.join(__dirname, `../public${imgPath}`);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
      gallery.image = JSON.stringify(updatedImages);
      await gallery.save({ transaction: t });
      await t.commit();
      return res.status(200).json({ success: true, message: "Gallery image removed successfully", images: updatedImages });
    } catch (error) {
      await t.rollback();
      console.error("Error in removeGalleryImage:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    saveGalleryImage,
    getGalleryImages,
    deleteGalleryImage,
    addGalleryImages,
    removeGalleryImage
};
