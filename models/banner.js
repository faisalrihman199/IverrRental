const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Banner = sequelize.define("Banner", {
    image:{
        type:DataTypes.TEXT,
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

module.exports = Banner;
