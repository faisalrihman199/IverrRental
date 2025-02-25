const fs = require('fs');
const path = require('path');
const { Banner } = require("../models");

// Save (Insert/Update) Banner
const saveBanner = async (req, res) => {
    try {
        const { id } = req.query;
        const { status } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Image file is required." });
        }

        const imagePath = `/uploads/banners/${file.filename}`;

        let banner;
        if (id) {
            // Update existing banner
            banner = await Banner.findByPk(id);
            if (!banner) {
                return res.status(404).json({ success: false, message: "Banner not found." });
            }

            // Delete the old image file
            if (banner.image) {
                const oldImagePath = path.join(__dirname, `../public${banner.image}`);
                console.log(`Trying to delete: ${oldImagePath}`);

                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error("Error deleting old image:", err);
                        else console.log("Old image deleted successfully.");
                    });
                } else {
                    console.log("Old image file not found.");
                }
            }

            await banner.update({ image: imagePath, status });
            return res.status(200).json({ success: true, message: "Banner updated successfully.", banner });
        } else {
            // Insert new banner
            banner = await Banner.create({ image: imagePath, status });
            return res.status(201).json({ success: true, message: "Banner created successfully.", banner });
        }
    } catch (error) {
        console.error("Error in saveBanner:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const getBanners = async (req, res) => {
    try {
        const { id, status } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;

        const banners = await Banner.findAll({ where: whereClause });
        return res.status(200).json({ success: true, banners });
    } catch (error) {
        console.error("Error in getBanners:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Delete Banner and Remove Image File
const deleteBanner = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: "Banner ID is required." });
        }

        const banner = await Banner.findByPk(id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found." });
        }

        // Delete the image file
        if (banner.image) {
            const imagePath = path.join(__dirname, `../public${banner.image}`);
            console.log(`Trying to delete: ${imagePath}`);

            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Error deleting image:", err);
                    else console.log("Image deleted successfully.");
                });
            } else {
                console.log("Image file not found.");
            }
        }

        await banner.destroy(); // Soft delete if paranoid mode is enabled
        return res.status(200).json({ success: true, message: "Banner deleted successfully." });
    } catch (error) {
        console.error("Error in deleteBanner:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    saveBanner,
    deleteBanner,
    getBanners
};
