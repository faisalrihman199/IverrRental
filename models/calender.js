const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * Calendar model represents availability blocks or special pricing for cars
 * - startDate, endDate: define the period
 * - status: e.g. "available", "booked", "blocked"
 * - specialPrice: override price for this period
 * - carId: FK to Cars.id
 */
const Calendar = sequelize.define("Calendar", {
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue:"available",
    allowNull: true,
  },
  specialPrice: {
    type: DataTypes.DECIMAL(10, 2),
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
}, {
  timestamps: true,
  tableName: "Calendars",
});

module.exports = Calendar;
