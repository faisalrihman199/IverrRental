const models = require("../models/index");
const bcrypt = require("bcrypt");
const sequelize = require("../config/db");
const { Op } = require('sequelize');
exports.register = async (req, res) => {
    const { email, password,firstName,lastName,phone } = req.body;
    const t = await sequelize.transaction();

    try {
        const existingUser = await models.User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await models.User.create(
            { email, password: hashedPassword, role: "admin", phone,firstName,lastName },
            { transaction: t }
        );
        await t.commit();
        res.status(201).json({ success: true, message: 'Registration successful', data:user });

    } catch (error) {
        console.error('Error registering user:', error.message);
        
        await t.rollback();
        
        res.status(500).send({success:false, message: error.message });
    }
};
exports.dashboardData = async (req, res) => {
  try {
    // Run all count queries concurrently
    const [banners,cities,FAQs,users, galleries,facilities] = await Promise.all([
      models.Banner.count(),
      models.City.count(),
      models.Car.count(), // Assuming this is for FAQs
      models.User.count({ where: { role: { [Op.ne]: 'admin' } } }),
      models.Gallery.count(),
      models.Facility.count()
    ]);

    // Send success response with all counts
    res.status(200).json({
      success: true,
      message: "Dashboard data retrieved successfully.",
      data: { banners, cities, FAQs, users, galleries, facilities }
    });
  } catch (error) {
    // Send error response if something goes wrong
    res.status(500).json({
      success: false,
      message: `Error retrieving dashboard data: ${error.message}`,
      data: null
    });
  }
};

  
  