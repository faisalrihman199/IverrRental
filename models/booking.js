const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Booking = sequelize.define("Booking", {
  carId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Cars',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rentPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue:null,
    allowNull: true,
  },
  pickupCity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dropOffCity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pickupOTP: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dropOffOTP: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pickDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  pickTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  returnDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  returnTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  insuranceFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  serviceFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Booking;
