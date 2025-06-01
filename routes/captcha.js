// routes/captcha.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/verify', async (req, res) => {
  const { token } = req.body;
  const key = process.env.CAPTCHA_KEY;

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${key}&response=${token}`
    );

    if (response.data.success) {
      return res.status(200).json({ 
        success: true,
        score: response.data.score, 
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid CAPTCHA" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
