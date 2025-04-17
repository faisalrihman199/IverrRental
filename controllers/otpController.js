const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const sequelize = require("../config/db");

function generateOTP(email) {
    const otp = speakeasy.totp({
        secret: email,  
        encoding: 'base32',     
        digits: 6   
    });
    console.log(otp);
    return otp;
}

function verifyOTP(token, email) {
    const verified = speakeasy.totp.verify({
        secret: email,
        encoding: 'base32',
        token: token,
        window: 1
    });
    return verified;
}

async function sendOTPEmail(email) {
    
    const otp = generateOTP(email);
    let transporter = nodemailer.createTransport({
        service: 'gmail',  // Adjust this according to your email service
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

    let info = await transporter.sendMail({
        from: '"Iverr Rental APP" <your-email@gmail.com>',
to: email,
subject: '🔑 Your OTP Code for Iverr Rental',
html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 500px;
      margin: 30px auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4CAF50;
      margin-bottom: 20px;
    }
    .otp {
      font-size: 22px;
      font-weight: bold;
      color: #333;
      background: #f3f3f3;
      display: inline-block;
      padding: 10px 20px;
      border-radius: 5px;
      letter-spacing: 3px;
      margin: 20px 0;
    }
    .message {
      font-size: 16px;
      color: #555;
    }
    .footer {
      margin-top: 20px;
      font-size: 14px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Iverr Rental APP</div>
    <p class="message">Hello,</p>
    <p class="message">Your One-Time Password (OTP) for Iverr Rental is:</p>
    <p class="otp">${otp}</p>
    <p class="message">Use this code to complete your verification. This OTP is valid for a limited time.</p>
    <p class="footer">If you didn’t request this, please ignore this email.</p>
    <p class="footer">Best regards, <br> Iverr Rental Team</p>
  </div>
</body>
</html>
`

    });

    console.log('Message sent: %s', info.messageId);
}

exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        await sendOTPEmail(email);
        res.status(200).send({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
};

exports.generateOTP = generateOTP;
exports.verifyOTP = verifyOTP;
exports.sendOTPEmail = sendOTPEmail;
