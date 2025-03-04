require('dotenv').config();
const models = require("../models/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sequelize = require("../config/db");
const otpController = require("./otpController");
const { Op } = require("sequelize");
const moment = require("moment");


const authController = {
    register: async (req, res) => {
        const { fullName, email, password, phone, otp } = req.body;

        if (!otpController.verifyOTP(otp, email)) {
            return res.status(500).json({ success: false, message: "OTP not correct" });
        }
        const t = await sequelize.transaction();
        try {
            // Check if the email already exists
            const existingUser = await models.User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Email already exists" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await models.User.create({ email, password: hashedPassword, phone, fullName }, { transaction: t });
            await t.commit();
            res.status(201).json({ success: true, message: "Registration successful" });
        } catch (error) {
            console.error("Error registering customer:", error);
            await t.rollback();
            res.status(500).json({ success: false, message: "Error while registration." });
        }
    },
    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            const user = await models.User.findOne({ where: { email } });
            if (!user) {
                return res.status(200).json({ success: false, message: "User not found" });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(200).json({ success: false, message: "Invalid password" });
            }
            if (user.role === 'inactive') {
                return res.status(200).json({ success: false, message: "Inactive Status, Please contact Admin" });
            }

            // Set token to expire in 1 minute
            const jwtOptions = user.role === 'admin' ? { expiresIn: '1m' } : {};

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_KEY,
                jwtOptions
            );

            res.status(200).json({
                success: true,
                message: "Login successful",
                data: {
                    role: user.role,
                    token
                }
            });
        } catch (error) {
            console.error("Error logging in:", error);
            res.status(500).json({ success: false, message: "Error logging in." });
        }
    },

    verifyOtpForPasswordReset: async (req, res) => {
        const { email, otp, newPassword } = req.body;

        if (!otpController.verifyOTP(otp, email)) {
            return res.status(500).json({ success: false, message: "OTP not correct" });
        }

        try {
            if (!newPassword) {
                return res.status(400).json({ success: false, message: "New password is required" });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await models.User.update({ password: hashedPassword }, { where: { email } });

            res.status(200).json({ success: true, message: "Password reset successfully" });
        } catch (error) {
            console.error("Error resetting password:", error);
            res.status(500).json({ success: false, message: "Error resetting password." });
        }
    },
    changePassword: async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!userId) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        try {
            const user = await models.User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordMatch) {
                return res.status(200).json({ success: false, message: "Current password is incorrect" });
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;
            await user.save();

            res.status(200).json({ success: true, message: "Password updated successfully" });
        } catch (error) {
            console.error("Error updating password:", error);
            res.status(500).json({ success: false, message: "Error updating password" });
        }
    },
    updateUserInfo: async (req, res) => {
        const userId = req.user.id;
        try {
            const user = await models.User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            const { fullName, phone, password, oldPassword } = req.body;
            if (fullName) {
                user.fullName = fullName;
            }
            if (phone) {
                user.phone = phone;
            }
            if (req.file) {
                user.image = `/uploads/users/${req.file.filename}`
            } else if (req.body.image) {
                user.image = req.body.image;
            }
            if (password) {
                if (!oldPassword) {
                    return res.status(400).json({ success: false, message: "Old password is required to update to a new password" });
                }
                const isMatch = await bcrypt.compare(oldPassword, user.password);
                if (!isMatch) {
                    return res.status(200).json({ success: false, message: "Old password is incorrect" });
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                user.password = hashedPassword;
            }

            await user.save();
            res.status(200).json({ success: true, message: "User info updated successfully" });
        } catch (error) {
            console.error("Error updating user info:", error);
            res.status(500).json({ success: false, message: "Error updating user info" });
        }
    },
    changeEmail: async (req, res) => {
        const { oldEmail, newEmail, newEmailOTP } = req.body;

        // Verify OTP for the new email using your OTP controller
        if (!otpController.verifyOTP(newEmailOTP, newEmail)) {
            return res.status(400).json({ success: false, message: "OTP not correct for new email" });
        }

        try {
            const userId = req.user.id;
            const user = await models.User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Ensure that the user's current email matches the provided oldEmail
            if (user.email !== oldEmail) {
                return res.status(400).json({ success: false, message: "Old email does not match current email" });
            }

            // Optional: Check if the new email is already taken by another user
            const existingUser = await models.User.findOne({ where: { email: newEmail } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "New email already in use" });
            }

            // Update the user's email
            user.email = newEmail;
            await user.save();

            return res.status(200).json({ success: true, message: "Email updated successfully" });
        } catch (error) {
            console.error("Error in changeEmail:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    },
    userInfo: async (req, res) => {
        try {
            const userId = req.user.id;
            const user = await models.User.findByPk(userId, {
                attributes: ['fullName', 'email', 'phone', 'image']
            });
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" })
            }
            return res.status(200).json({ success: true, data: user, message: "User info retrieved successfully" });
        } catch (error) {
            console.error("Error in userInfo:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    },
    getNonAdminUsers: async (req, res) => {
        try {
            const users = await models.User.findAll({
                where: { role: { [Op.ne]: "admin" } },
                attributes: [
                    "id",
                    "fullName",
                    "email",
                    "phone",
                    ["role", "status"],
                    ["createdAt", "joinedDate"]
                ],
                order: [["createdAt", "DESC"]]
            });

            // Format joinedDate
            const formattedUsers = users.map(user => ({
                ...user.get(),
                joinedDate: moment(user.joinedDate).format("DD-MMM-YYYY")
            }));

            res.status(200).json({ success: true, data: formattedUsers });
        } catch (error) {
            console.error("Error fetching non-admin users:", error);
            res.status(500).json({ success: false, message: "Error fetching users" });
        }
    },
    updateUserStatus: async (req, res) => {
        const { userId, status } = req.query;
        try {
            const user = await models.User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            console.log("User found :", user);


            // Update role based on the status provided
            user.role = status;

            await user.save();

            res.status(200).json({ success: true, message: "User Status updated successfully", staus: user.role });
        } catch (error) {
            console.error("Error updating user role:", error);
            res.status(500).json({ success: false, message: "Error updating user role" });
        }
    },

}

module.exports = authController;
