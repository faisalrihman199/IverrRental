'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Check if firstName and lastName columns already exist, then add if necessary
    const columns = await queryInterface.describeTable('Users'); // Get table's column details

    if (!columns.firstName) {
      // Add firstName column if it doesn't already exist
      await queryInterface.addColumn('Users', 'firstName', {
        type: Sequelize.STRING,
        allowNull: true, // Allow null temporarily
      });
    }

    if (!columns.lastName) {
      // Add lastName column if it doesn't already exist
      await queryInterface.addColumn('Users', 'lastName', {
        type: Sequelize.STRING,
        allowNull: true, // Allow null temporarily
      });
    }

    // Step 2: Update firstName and lastName from the fullName column based on the DB type
    await queryInterface.sequelize.query(`
      UPDATE Users
      SET firstName = SUBSTRING_INDEX(fullName, ' ', 1),
          lastName = SUBSTRING_INDEX(fullName, ' ', -1);
    `);

    // Step 3: Drop the fullName column
    await queryInterface.removeColumn('Users', 'fullName');
  },

  down: async (queryInterface, Sequelize) => {
    // Step 1: Check if fullName column already exists, then add if necessary
    const columns = await queryInterface.describeTable('Users'); // Get table's column details
    if (!columns.fullName) {
      // Add fullName column if it doesn't already exist
      await queryInterface.addColumn('Users', 'fullName', {
        type: Sequelize.STRING,
        allowNull: true, // Allow null temporarily
      });
    }
    // Step 2: Rebuild fullName by concatenating firstName and lastName
    await queryInterface.sequelize.query(`
      UPDATE Users
      SET fullName = CONCAT(firstName, ' ', lastName);
    `);
    // Step 3: Remove firstName and lastName columns
    if (columns.firstName) {
      await queryInterface.removeColumn('Users', 'firstName');
    }
    if (columns.lastName) {
      await queryInterface.removeColumn('Users', 'lastName');
    }
  }
};
