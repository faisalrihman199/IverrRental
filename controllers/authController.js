require('dotenv').config();
const models = require("../models/index");
const fs        = require("fs");
const bcrypt = require("bcrypt");
const path      = require("path");        // ← add this!
const jwt = require("jsonwebtoken");
const sequelize = require("../config/db");
const otpController = require("./otpController");
const { Op } = require("sequelize");
const moment = require("moment");


const authController = {
    register: async (req, res) => {
        const { firstName,lastName, email, password, phone, otp } = req.body;

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

            const user = await models.User.create({ email, password: hashedPassword, phone, firstName,lastName }, { transaction: t });
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
            const jwtOptions = user.role === 'admin' ? { expiresIn: '24h' } : {};

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
      const t      = await sequelize.transaction();
    
      try {
        // 1) Find & update User
        const user = await models.User.findByPk(userId, { transaction: t });
        if (!user) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "User not found" });
        }
    
        const { firstName, lastName, phone, password, oldPassword, description, bankAccount } = req.body;
        if (firstName)    user.firstName   = firstName;
        if (lastName)     user.lastName    = lastName;
        if (phone)        user.phone       = phone;
        if (description)  user.description = description;
        if (bankAccount)  user.bankAccount = bankAccount;
    
        // Profile image handling
        if (req.file) {
          if (user.image) {
            const rel       = user.image.replace(/^\/+/, "");
            const oldImgPath = path.join(__dirname, "..", "public", rel);
            try {
              if (fs.existsSync(oldImgPath)) fs.unlinkSync(oldImgPath);
            } catch (e) {
              console.warn(`Could not delete old profile image at ${oldImgPath}:`, e);
            }
          }
          user.image = `/uploads/users/${req.file.filename}`;
        } else if (req.body.image) {
          user.image = req.body.image;
        }
    
        // Password change
        if (password) {
          if (!oldPassword) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Old password is required" });
          }
          const match = await bcrypt.compare(oldPassword, user.password);
          if (!match) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Old password is incorrect" });
          }
          user.password = await bcrypt.hash(password, 10);
        }
    
        await user.save({ transaction: t });
    
        // 2) Handle UserDocument uploads + delete any previous files
        const fileFields = ["cnicOrPassport", "drivingLicense", "companyDoc"];
        const hasFile    = fileFields.some(f => Array.isArray(req.files?.[f]) && req.files[f].length > 0);
    
        if (hasFile) {
          const [doc] = await models.UserDocument.findOrCreate({
            where:    { userId },
            defaults: { userId },
            transaction: t,
          });
    
          for (const field of fileFields) {
            const files = req.files?.[field] || [];
            if (files.length) {
              // delete old files if any
              if (doc[field]) {
                try {
                  const oldPaths = JSON.parse(doc[field]);
                  for (const relPath of oldPaths) {
                    const rel = relPath.replace(/^\/+/, "");
                    const oldPath = path.join(__dirname, "..", "public", rel);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                  }
                } catch (e) {
                  console.warn(`Could not parse or delete old ${field}:`, e);
                }
              }
              // Save new file paths array
              const newPaths = files.map(f => `/uploads/userDocs/${f.filename}`);
              doc[field] = JSON.stringify(newPaths);
            }
          }
    
          await doc.save({ transaction: t });
        }
    
        await t.commit();
        return res.status(200).json({ success: true, message: "User (and documents) updated" });
      } catch (err) {
        await t.rollback();
        console.error("Error updating user info:", err);
        return res.status(500).json({ success: false, message: "Error updating user info" });
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

        let {userId}=req.query;
        userId =userId ||  req.user.id;
        
        // 1) fetch basic user info
        const user = await models.User.findByPk(userId, {
          attributes: ['firstName','lastName','email','phone','image','bankAccount','description']
        });
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
    
        // 2) fetch their documents
        const docsRecord = await models.UserDocument.findOne({
          where: { userId },
          attributes: [
            'cnicOrPassport',
            'cnicOrPassportStatus',
            'drivingLicense',
            'drivingLicenseStatus',
            'companyDoc',
            'companyDocStatus'
          ]
        });
    
        // 3) prepare documents: parse JSON strings into arrays
        let documents = null;
        if (docsRecord) {
          const raw = docsRecord.get({ plain: true });
          documents = {
            cnicOrPassport: [],
            cnicOrPassportStatus: raw.cnicOrPassportStatus,
            drivingLicense: [],
            drivingLicenseStatus: raw.drivingLicenseStatus,
            companyDoc: [],
            companyDocStatus: raw.companyDocStatus,
          };
          // parse each field that should be an array
          ['cnicOrPassport', 'drivingLicense', 'companyDoc'].forEach(field => {
            const val = raw[field];
            if (typeof val === 'string') {
              try {
                documents[field] = JSON.parse(val);
              } catch (e) {
                documents[field] = [];
              }
            }
          });
        }
    
        // 4) respond with both
        return res.status(200).json({
          success: true,
          data: {
            user,
            documents
          },
          message: "User info (and documents) retrieved successfully"
        });
      } catch (error) {
        console.error("Error in userInfo:", error);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
    serviceFee:async(req,res)=>{
      return res.status(200).json({status:true,data:"5%"});
    },
       
    getNonAdminUsers: async (req, res) => {
        try {
            const users = await models.User.findAll({
                where: { role: { [Op.ne]: "admin" } },
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
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
        const { userId, status, ...rest } = req.query;
    
        if (!userId) {
          return res
            .status(400)
            .json({ success: false, message: "userId is required" });
        }
    
        try {
          // 1) Fetch user
          const user = await models.User.findByPk(userId);
          if (!user) {
            return res
              .status(404)
              .json({ success: false, message: "User not found" });
          }
    
          let userChanged = false;
          // 2) Update user.role if `status` provided
          if (status !== undefined) {
            user.role = status;
            userChanged = true;
            await user.save();
          }
    
          // 3) Handle document‐status updates
          const docStatusKeys = [
            "cnicOrPassportStatus",
            "drivingLicenseStatus",
            "companyDocStatus",
          ];
          // pick only the provided status params
          const requestedUpdates = docStatusKeys
            .filter((k) => rest[k] !== undefined)
            .reduce((acc, k) => {
              acc[k] = rest[k];
              return acc;
            }, {});
    
          let docChanged = false, doc;
          if (Object.keys(requestedUpdates).length > 0) {
            // fetch or create the UserDocument row
            [doc] = await models.UserDocument.findOrCreate({
              where:    { userId },
              defaults: { userId },
            });
    
            // for each requested status, only update if the file field is non-null
            for (const [statusKey, newVal] of Object.entries(requestedUpdates)) {
              // derive the file field name by stripping "Status"
              const fileKey = statusKey.replace(/Status$/, "");
              if (doc[fileKey]) {
                doc[statusKey] = newVal;
                docChanged = true;
              }
            }
    
            if (docChanged) {
              await doc.save();
            }
          }
    
          return res.status(200).json({
            success: true,
            message: `Status ${(userChanged || docChanged)?"":"without file not"} updated`,
            user:  userChanged ? { role: user.role } : undefined,
            docs:  docChanged  ? requestedUpdates : undefined,
          });
        } catch (err) {
          console.error("Error updating status:", err);
          return res
            .status(500)
            .json({ success: false, message: "Error updating status" });
        }
      },
    deleteUserAccount: async (req, res) => {
        try {
            const { userId } = req.query;
            const loggedInUser = req.user;
    
            const targetUserId = userId || loggedInUser.id;
            const isAdmin = loggedInUser.role === 'admin';
    
            if (!isAdmin && targetUserId !== loggedInUser.id) {
                return res.status(403).json({ success: false, message: "You are not authorized to delete this user." });
            }
    
            const user = await models.User.findByPk(targetUserId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
    
            await user.destroy();
    
            return res.status(200).json({ success: true, message: "User account deleted successfully" });
        } catch (error) {
            console.error("Error deleting user account:", error);
            return res.status(500).json({ success: false, message: "Error deleting user account" });
        }
    },

    getAllUsersWithDocs: async (req, res) => {
      try {
          const users = await models.User.findAll({
              include: [
                  {
                      model: models.UserDocument,
                      as: 'userDocument',
                  }
              ]
          });
  
          const response = users.map(user => {
              const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
              const email = user.email;
  
              const userDocs = user.userDocument;
  
              const allDocs = {};
              const pendingDocs = [];
              const history = [];
              const approvedFiles = [];
  
              if (userDocs) {
                  const docFields = ['cnicOrPassport', 'drivingLicense', 'companyDoc'];
  
                  for (const field of docFields) {
                      if (userDocs[field]) {
                          let files = [];
                          try {
                              files = JSON.parse(userDocs[field]);
                          } catch (err) {
                              console.warn(`Failed to parse files for ${field}:`, err);
                          }
  
                          allDocs[field] = files;
  
                          // Mocked status check — assuming you have statuses per doc stored somewhere separately
                          const docStatus = userDocs[`${field}Status`] || 'pending'; // default pending
                          const updatedAt = userDocs.updatedAt;
  
                          if (docStatus === 'pending') {
                              pendingDocs.push(field);
                          } else {
                              history.push({
                                  updated_at: updatedAt,
                                  docType: field,
                                  status: docStatus,
                              });
                              if (docStatus === 'approved') {
                                  approvedFiles.push({
                                      docType: field,
                                      files: files,
                                  });
                              }
                          }
                      }
                  }
              }
  
              return {
                  name: fullName,
                  email,
                  allDocs,
                  pendingDocsCount: pendingDocs.length,
                  history,
                  approvedFiles
              };
          });
  
          return res.status(200).json({ success: true, data: response });
  
      } catch (error) {
          console.error('Error fetching users with docs:', error);
          return res.status(500).json({ success: false, message: "Failed to fetch users with docs" });
      }
  },
  
    
}

module.exports = authController;
