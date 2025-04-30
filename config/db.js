require('dotenv').config();
const { Sequelize } = require('sequelize');

// Log environment variables to confirm they are loaded correctly
console.log('Connecting to MySQL DB with:');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('Password:', process.env.DB_PASSWORD);
console.log('Port:', process.env.DB_PORT);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    pool: {
      max: 150,
      min: 0,
      acquire: 30000, // 30 seconds instead of 30 million ms
      idle: 10000
    },
    logging: console.log, // Enable query logging
  }
);

// Test connection and sync
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');
    
    await sequelize.sync(); // Optional: Only if you want to sync models
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
})();

module.exports = sequelize;
