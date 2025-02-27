const fs = require('fs');
const path = require('path');
const { Facility } = require("../models");

// Save (Insert/Update) Facility
const saveFacility = async (req, res) => {
    try {
        const { id } = req.query;
        const { name, status } = req.body;
        const file = req.file;

        if (!name) {
            return res.status(400).json({ success: false, message: "Facility name is required." });
        }

        let imagePath = null;
        if (file) {
            imagePath = `/uploads/facilities/${file.filename}`;
        }

        let facility;
        if (id) {
            // Update existing facility
            facility = await Facility.findByPk(id);
            if (!facility) {
                return res.status(404).json({ success: false, message: "Facility not found." });
            }

            // Delete old image if new image is provided
            if (facility.image && file) {
                const oldImagePath = path.join(__dirname, `../public${facility.image}`);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            await facility.update({ name, image: imagePath || facility.image, status });
            return res.status(200).json({ success: true, message: "Facility updated successfully.", facility });
        } else {
            // Insert new facility
            facility = await Facility.create({ name, image: imagePath, status });
            return res.status(201).json({ success: true, message: "Facility created successfully.", facility });
        }
    } catch (error) {
        console.error("Error in saveFacility:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Get All Facilities
const getFacilities = async (req, res) => {
    try {
        const { id, status } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;

        const facilities = await Facility.findAll({ where: whereClause });
        return res.status(200).json({ success: true, data:facilities });
    } catch (error) {
        console.error("Error in getFacilities:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Delete Facility
const deleteFacility = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: "Facility ID is required." });
        }

        const facility = await Facility.findByPk(id);
        if (!facility) {
            return res.status(404).json({ success: false, message: "Facility not found." });
        }

        // Delete the image file
        if (facility.image) {
            const imagePath = path.join(__dirname, `../public${facility.image}`);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await facility.destroy();
        return res.status(200).json({ success: true, message: "Facility deleted successfully." });
    } catch (error) {
        console.error("Error in deleteFacility:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    saveFacility,
    getFacilities,
    deleteFacility
};
