// models/message.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * Message model represents chat messages within a conversation
 * - content        : text body of the message
 * - file           : optional file URL or path
 * - status         : delivery/read status (e.g., "sent", "delivered", "read")
 * - deleted        : who deleted the message ("none", "me", "everyone")
 * - sender         : user ID of the sender
 * - receiver       : user ID of the receiver
 * - replied        : message ID this one is replying to
 * - conversationId : conversation thread this message belongs to
 * - timestamps     : createdAt, updatedAt
 * All foreign keys set to NULL on delete of referenced row.
 */
const Message = sequelize.define("Message", {
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  file: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "sent",
  },
  deleted: {
    type: DataTypes.ENUM("none", "me", "everyone"),
    allowNull: false,
    defaultValue: "none",
  },
  sender: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Users",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  receiver: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Users",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  replied: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Messages",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Conversations",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
}, {
  timestamps: true,
  tableName: "Messages"
});

module.exports = Message;
