const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * Conversation model tracks conversation threads between users
 * - status: current state (e.g., "open", "closed")
 * - createdBy: ID of the user who initiated the conversation
 * - createFor: ID of the user for whom the conversation is created
 * - timestamps: createdAt, updatedAt
 * On delete of either user, the foreign key will be set to NULL.
 */
const Conversation = sequelize.define("Conversation", {
  status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Users",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  createdFor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Users",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  }
}, {
  timestamps: true,
});

module.exports = Conversation;
