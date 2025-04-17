const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CarDocument = sequelize.define(
  "CarDocument",
  {
    // Each document field stores a JSON array of file paths
    grayCard: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    controlTechniqueText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    controlTechniqueFiles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assuranceText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assuranceFiles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    carId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Cars",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
  },
  {
    timestamps: true,
    tableName: "CarDocuments",
  }
);

module.exports = CarDocument;
