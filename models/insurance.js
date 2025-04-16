const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Insurance = sequelize.define("Insurance", {
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rentPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  securityDeposit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  carId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Cars',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  timestamps: true,
  tableName: 'Insurances',
});

module.exports = Insurance;
