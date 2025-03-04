const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
    fullName:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    phone:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true, // Validate that the value is a valid email format
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "user", 
        
    },
    image:{
        type:DataTypes.TEXT,
        allowNull: true,
    }
}, {
    timestamps: true, 
});

module.exports = User;
