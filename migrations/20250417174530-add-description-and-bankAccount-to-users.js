'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Describe the Users table to check for existing columns
    const columns = await queryInterface.describeTable('Users');

    // 2. Add description column if it doesn't already exist
    if (!columns.description) {
      await queryInterface.addColumn('Users', 'description', {
        type: Sequelize.TEXT,
        allowNull: true,   // optional user bio/description
      });
    }

    // 3. Add bankAccount column if it doesn't already exist
    if (!columns.bankAccount) {
      await queryInterface.addColumn('Users', 'bankAccount', {
        type: Sequelize.STRING,
        allowNull: true,   // store account number or IBAN as string
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Describe the Users table to check existing columns
    const columns = await queryInterface.describeTable('Users');

    // 2. Remove description column if present
    if (columns.description) {
      await queryInterface.removeColumn('Users', 'description');
    }

    // 3. Remove bankAccount column if present
    if (columns.bankAccount) {
      await queryInterface.removeColumn('Users', 'bankAccount');
    }
  }
};
