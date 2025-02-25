const fs = require("fs");
const path = require("path");
const { Coupon } = require("../models");

// Save (Insert/Update) Coupon
const saveCoupon = async (req, res) => {
    try {
        const { id } = req.query;
        const { expiry, code, title, subtitle, status, minValue, value, description } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Image file is required." });
        }

        const imagePath = `/uploads/coupons/${file.filename}`;

        let coupon;
        if (id) {
            // Update existing coupon
            coupon = await Coupon.findByPk(id);
            if (!coupon) {
                return res.status(404).json({ success: false, message: "Coupon not found." });
            }

            // Delete the old image file
            if (coupon.image) {
                const oldImagePath = path.join(__dirname, `../public${coupon.image}`);
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

            await coupon.update({ expiry, code, title, subtitle, status, minValue, value, description, image: imagePath });
            return res.status(200).json({ success: true, message: "Coupon updated successfully.", coupon });
        } else {
            // Insert new coupon
            coupon = await Coupon.create({ expiry, code, title, subtitle, status, minValue, value, description, image: imagePath });
            return res.status(201).json({ success: true, message: "Coupon created successfully.", coupon });
        }
    } catch (error) {
        console.error("Error in saveCoupon:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Get Coupons (Single/All)
const getCoupons = async (req, res) => {
    try {
        const { id, status } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;

        const coupons = await Coupon.findAll({ where: whereClause, order: [["createdAt", "DESC"]] });
        return res.status(200).json({ success: true, coupons });
    } catch (error) {
        console.error("Error in getCoupons:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Delete Coupon and Remove Image File
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: "Coupon ID is required." });
        }

        const coupon = await Coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        // Delete the image file
        if (coupon.image) {
            const imagePath = path.join(__dirname, `../public${coupon.image}`);
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

        await coupon.destroy();
        return res.status(200).json({ success: true, message: "Coupon deleted successfully." });
    } catch (error) {
        console.error("Error in deleteCoupon:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    saveCoupon,
    getCoupons,
    deleteCoupon,
};
