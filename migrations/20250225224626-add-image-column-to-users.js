'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the 'image' column to the 'Users' table
    await queryInterface.addColumn('Users', 'image', {
      type: Sequelize.STRING,
      allowNull: true, // Change to false if you want this column to be required
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the 'image' column from the 'Users' table
    await queryInterface.removeColumn('Users', 'image');
  }
};
