const models = require("../models/index");
const bcrypt = require("bcrypt");
const sequelize = require("../config/db");

exports.register = async (req, res) => {
    const { email, password,fullName,phone } = req.body;
    const t = await sequelize.transaction();

    try {
        const existingUser = await models.User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await models.User.create(
            { email, password: hashedPassword, role: "admin", phone,fullName },
            { transaction: t }
        );
        await t.commit();
        res.status(201).json({ success: true, message: 'Registration successful', data:user });

    } catch (error) {
        console.error('Error registering user:', error.message);
        
        await t.rollback();
        
        res.status(500).send({ message: error.message });
    }
};
