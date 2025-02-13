const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FAQ = sequelize.define("FAQ", {
    question: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    answer: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        // defaultValue: "active",
        // validate: {
        //     isIn: [["active", "inactive"]],
        // },
    },
}, {
    timestamps: true,
});

module.exports = FAQ;
