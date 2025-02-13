const { FAQ } = require("../models");

// Save (Insert/Update) FAQ
const saveFAQ = async (req, res) => {
    try {
        const { id } = req.query;
        const { question, answer, status } = req.body;

        if (!question || !answer || !status) {
            return res.status(400).json({ message: "All fields (question, answer, status) are required." });
        }

        let faq;
        if (id) {
            // Update existing FAQ
            faq = await FAQ.findByPk(id);
            if (!faq) {
                return res.status(404).json({ message: "FAQ not found." });
            }

            await faq.update({ question, answer, status });
            return res.status(200).json({ message: "FAQ updated successfully.", faq });
        } else {
            // Insert new FAQ
            faq = await FAQ.create({ question, answer, status });
            return res.status(201).json({ message: "FAQ created successfully.", faq });
        }
    } catch (error) {
        console.error("Error in saveFAQ:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Get All FAQs or by ID or Status
const getFAQs = async (req, res) => {
    try {
        const { id, status } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;

        const faqs = await FAQ.findAll({ where: whereClause });
        return res.status(200).json({ faqs });
    } catch (error) {
        console.error("Error in getFAQs:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: "FAQ ID is required." });
        }

        const faq = await FAQ.findByPk(id);
        if (!faq) {
            return res.status(404).json({ message: "FAQ not found." });
        }

        await faq.destroy(); // Soft delete if paranoid mode is enabled
        return res.status(200).json({ message: "FAQ deleted successfully." });
    } catch (error) {
        console.error("Error in deleteFAQ:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = {
    saveFAQ,
    getFAQs,
    deleteFAQ
};
