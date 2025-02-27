const { Page } = require("../models");

// Save (Insert/Update) Page
const savePage = async (req, res) => {
    try {
        const { id } = req.query;
        const { title, status, description } = req.body;

        if (!title || !status || !description) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields (title, status, description) are required." 
            });
        }

        let page;
        if (id) {
            // Update existing Page
            page = await Page.findByPk(id);
            if (!page) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Page not found." 
                });
            }
            await page.update({ title, status, description });
            return res.status(200).json({ 
                success: true, 
                message: "Page updated successfully.", 
                page 
            });
        } else {
            // Insert new Page
            page = await Page.create({ title, status, description });
            return res.status(201).json({ 
                success: true, 
                message: "Page created successfully.", 
                page 
            });
        }
    } catch (error) {
        console.error("Error in savePage:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error." 
        });
    }
};

// Get All Pages or by ID or Status
const getPages = async (req, res) => {
    try {
        const { id, status } = req.query;
        let whereClause = {};

        if (id) whereClause.id = id;
        if (status) whereClause.status = status;

        const pages = await Page.findAll({ where: whereClause });
        return res.status(200).json({ 
            success: true, 
            data: pages 
        });
    } catch (error) {
        console.error("Error in getPages:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error." 
        });
    }
};

// Delete Page
const deletePage = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                message: "Page ID is required." 
            });
        }

        const page = await Page.findByPk(id);
        if (!page) {
            return res.status(404).json({ 
                success: false, 
                message: "Page not found." 
            });
        }

        await page.destroy(); // Soft delete if paranoid mode is enabled
        return res.status(200).json({ 
            success: true, 
            message: "Page deleted successfully." 
        });
    } catch (error) {
        console.error("Error in deletePage:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error." 
        });
    }
};

module.exports = {
    savePage,
    getPages,
    deletePage
};
