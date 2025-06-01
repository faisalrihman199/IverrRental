const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const sequelize = require("../config/db");
const models = require('../models');

function generateOTP(email) {
  const otp = speakeasy.totp({
    secret: email,
    encoding: 'base32',
    digits: 6,
    step: 900  // 15 minutes
  });
  console.log(otp);
  return otp;
}

function verifyOTP(token, email) {
  const verified = speakeasy.totp.verify({
    secret: email,
    encoding: 'base32',
    token: token,
    step: 900,
    window: 1
  });
  return verified;
}

async function sendOTPEmail(email, firstName) {
  const otp = generateOTP(email);
  const currentDate = new Date();

  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const formattedDate = currentDate.toLocaleDateString('en-GB', options);

  let transporter = nodemailer.createTransport({
    host: 'mail.ivver.ma',
    port: 465,
    secure: true,
    // service: 'gmail',

    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>IVVER OTP</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #bdb0b046; font-size: 14px;">
    <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px">
      <header>
        <table style="width: 100%">
          <tbody>
            <tr style="height: 0">
              <td>
                <span style="background: #000000; font-size: 30px; line-height: 30px; color: #000000">..</span>
                <span style="background: #000000; font-size: 30px; line-height: 30px; color: #ffffff">I V V E R</span>
                <span style="background: #000000; font-size: 30px; line-height: 30px; color: #000000">...</span>
              </td>
              <td style="text-align: right">
                <span style="font-size: 16px; line-height: 30px; color: #000000">${formattedDate}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <main>
        <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
          <div style="width: 100%; max-width: 489px; margin: 0 auto">
            <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Your OTP</h1>
            <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Hey ${firstName},</p>
            <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px;">
              <span style="font-weight: 100; color: #7e7b7bc0">Thank you for choosing IVVER. Use the following OTP to complete
                the procedure.<span style="font-weight: 600; color: #1f1f1f">
                  OTP is valid for 15 minutes</span>. Do not share this code with others, including IVVER employees.
            </p>
            <p style="margin: 0; margin-top: 60px; font-size: 40px; font-weight: 600; letter-spacing: 25px; color: #ba3d4f;">
              ${otp}
            </p>
          </div>
        </div>

        <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c;">
          Need help? Ask at
          <a href="mailto:support@ivver.ma" style="color: #499fb6; text-decoration: none">support@ivver.ma</a>
          or visit our
          <a href="#" target="_blank" style="color: #499fb6; text-decoration: none">Help Center</a>
        </p>
      </main>

      <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #cec9c9;">
        <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">IVV Technologies, Casablanca, Morocco.</p>
        <p style="margin: 0; margin-top: 16px; color: #434343;">Copyright ©. All rights reserved.</p>
      </footer>
    </div>
  </body>
</html>`;

  let info = await transporter.sendMail({
    from: '"Iverr Rental APP" <your-email@gmail.com>',
    to: email,
    subject: '🔑 Your OTP Code for Iverr Rental',
    html: htmlBody
  });

  console.log('Message sent: %s', info.messageId);
}


exports.sendOtp = async (req, res) => {
  try {
    let { email,firstName } = req.body;
    if(!firstName){
      const user = await models.User.findOne({ where: { email } });
      if(user){
        firstName=user?.firstName;
      }
      else{
        firstName="Iverr User"
      }
    }
    await sendOTPEmail(email,firstName);
    res.status(200).send({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

exports.generateOTP = generateOTP;
exports.verifyOTP = verifyOTP;
exports.sendOTPEmail = sendOTPEmail;
