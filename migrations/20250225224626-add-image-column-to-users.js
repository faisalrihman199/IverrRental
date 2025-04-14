'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the 'image' column to the 'Users' table
    const columns = await queryInterface.describeTable('Users'); // Get table's column details

    if (!columns.image) {
      await queryInterface.addColumn('Users', 'image', {
        type: Sequelize.STRING,
        allowNull: true, 
      });
    }
    
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the 'image' column from the 'Users' table
    await queryInterface.removeColumn('Users', 'image');
  }
};
