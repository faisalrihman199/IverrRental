const fs = require("fs");
const path = require("path");
const { Coupon } = require("../models");
const { Op } = require("sequelize"); // Import Sequelize operator for NOT EQUAL check
const moment = require('moment');

// Save (Insert/Update) Coupon
const saveCoupon = async (req, res) => {
    try {
        const { id } = req.query;
        const { expiry, code, title, subtitle, status, minValue, value, description } = req.body;
        const file = req.file;

        // Check for coupon code uniqueness
        let couponExists;
        if (id) {
            // Updating: Look for a coupon with the same code but different id
            couponExists = await Coupon.findOne({
                where: {
                    code,
                    id: { [Op.ne]: id }
                }
            });
        } else {
            // Creating: Look for any coupon with the same code
            couponExists = await Coupon.findOne({ where: { code } });
        }
        if (couponExists) {
            return res.status(200).json({ success: false, message: "Coupon code already exist." });
        }

        // In insertion mode, image file is required.
        if (!id && !file) {
            return res.status(400).json({ success: false, message: "Image file is required." });
        }

        let imagePath;
        if (file) {
            imagePath = `/uploads/coupons/${file.filename}`;
        }

        let coupon;
        if (id) {
            // Update existing coupon
            coupon = await Coupon.findByPk(id);
            if (!coupon) {
                return res.status(404).json({ success: false, message: "Coupon not found." });
            }

            // Delete the old image file if a new file is provided
            if (file && coupon.image) {
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

            await coupon.update({
                expiry, code, title, subtitle, status, minValue, value, description,
                image: file ? imagePath : coupon.image // Retain previous image if no new file provided
            });
            return res.status(200).json({ success: true, message: "Coupon updated successfully.", coupon });
        } else {
            // Insert new coupon
            coupon = await Coupon.create({
                expiry, code, title, subtitle, status, minValue, value, description, image: imagePath
            });
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

        const formattedCoupons = coupons.map(coupon => ({
            ...coupon.dataValues,
            expiry: moment(coupon.expiry).format('DD-MMM-YYYY')
        }));

        return res.status(200).json({ success: true, data: formattedCoupons });
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

// Get Unique Coupon Code
const getCode = async (req, res) => {
    try {
        let code;
        let exists = true;
        // Keep generating until a unique code is found
        do {
            code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const coupon = await Coupon.findOne({ where: { code } });
            exists = !!coupon;
        } while (exists);
        return res.status(200).json({ success: true, code });
    } catch (error) {
        console.error("Error generating coupon code:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    saveCoupon,
    getCoupons,
    deleteCoupon,
    getCode,
};
