const { City } = require('../models');

// Add or Update City
const saveCity = async (req, res) => {
    try {
        const { id } = req.query; // Check if city ID is provided in query
        const { name, status } = req.body;

        if (!name || !status) {
            return res.status(400).json({ message: "Name and status are required." });
        }

        let city;
        if (id) {
            // Update existing city
            city = await City.findByPk(id);
            if (!city) {
                return res.status(404).json({ message: "City not found." });
            }
            city.name = name;
            city.status = status;
            await city.save();
        } else {
            // Create new city
            city = await City.create({ name, status });
        }

        res.status(200).json({ message: "City saved successfully.", city });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error saving city." });
    }
};

// Get Cities (by status, id, or all)
const getCities = async (req, res) => {
    try {
        const { status, id } = req.query;
        let whereCondition = {};

        if (id) {
            whereCondition.id = id;
        }
        if (status) {
            whereCondition.status = status;
        }

        const cities = await City.findAll({ where: whereCondition });
        res.status(200).json(cities);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching cities." });
    }
};

// Delete City
const deleteCity = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: "City ID is required." });
        }

        const city = await City.findByPk(id);
        if (!city) {
            return res.status(404).json({ message: "City not found." });
        }

        await city.destroy();
        res.status(200).json({ message: "City deleted successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting city." });
    }
};

module.exports = {
   saveCity,
   getCities,
   deleteCity
};
