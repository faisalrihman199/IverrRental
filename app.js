const express = require('express');
const app = express();
const routes = require('./routes');
const { sequelize } = require('./models');
const cors = require("cors");
const path = require('path');
const scheduleFileCleanup = require('./schedulers/cleanOldDocs');
scheduleFileCleanup();

// Configure CORS middleware
const corsOptions = {
  origin: '*', // Allow all origins for development (specify proper origin in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware before other middleware
app.use(cors(corsOptions));

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files with CORS enabled
app.use('/api/uploads', cors(corsOptions), express.static(path.join(__dirname, 'public/uploads')));

// Use routes
app.use('/api', routes);

// Database connection
sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
}).catch(err => {
    console.error('Unable to connect to the database:', err);
});

module.exports = app;