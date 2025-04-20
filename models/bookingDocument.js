const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * BookingDocument stores uploaded files and descriptions for pickup/dropoff
 * - carPickDocs: JSON array of file paths for vehicle condition at pickup
 * - personPickDocs: JSON array of file paths for driver/passenger ID at pickup
 * - carDropDocs: JSON array of file paths for vehicle condition at dropoff
 * - personDropDocs: JSON array of file paths for driver/passenger ID at dropoff
 * - pickDescription: text notes for pickup
 * - dropDescription: text notes for dropoff
 * - bookingId: FK to Booking.id
 */
const BookingDocument = sequelize.define("BookingDocument", {
  carPickDocs: {
    type: DataTypes.TEXT,
    allowNull: true,  // JSON stringified array of paths
  },
  personPickDocs: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  carDropDocs: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  personDropDocs: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pickDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dropDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Bookings',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  }
}, {
  timestamps: true,
  tableName: 'BookingDocuments',
});

module.exports = BookingDocument;
