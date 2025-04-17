const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserDocument = sequelize.define("UserDocument", {
  cnicOrPassport: {
    type: DataTypes.STRING,
    allowNull: true,     // stores the image path/URL
  },
  cnicOrPassportStatus: {
    type: DataTypes.STRING,
    defaultValue:'pending',
    allowNull: true,     // e.g. 'pending', 'verified', etc.
  },
  drivingLicense: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  drivingLicenseStatus: {
    type: DataTypes.STRING,
    defaultValue:'pending',
    allowNull: true,
  },
  companyDoc: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  companyDocStatus: {
    type: DataTypes.STRING,
    defaultValue:'pending',
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
}, {
  timestamps: true,  
});

module.exports = UserDocument;
