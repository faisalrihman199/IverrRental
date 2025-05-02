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
  const currentDate = new Date();

  // Format the date manually
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const formattedDate = currentDate.toLocaleDateString('en-GB', options);
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
    html: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IVVER OTP Verification</title>
</head>

<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; line-height: 1.5;">
    <div style="max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; table-layout: fixed;">
            <tr>
                <td style="padding: 10px 0px; text-align: left;">
                    <img src="https://i.postimg.cc/q7Td7GMc/Screenshot-2025-05-03-at-4-18-29-AM.png" alt="IVVER Logo" height="30" width="100">
                </td>
                <td style="font-size: 12px; color: #888; text-align: right; padding: 10px 0px;">
                    ${formattedDate}
                </td>
            </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; background-color: #ffffff; border-radius: 20px; padding: 3%; text-align: center;">
            <tr>
                <td style="text-align: center;">
                    <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Your OTP</h2>
                    <p style="font-size: 16px; margin-bottom: 10px;">Hey,</p>
                    <p style="font-size: 14px; margin-bottom: 20px; padding: 0px 40px; line-height: 1.6;">Thank you for choosing IVVER. Use the following OTP to complete the procedure to change your email address. OTP is valid for <b>15 minutes.</b> Do not share this code with others, including IVVER employees.</p>
                    <p style="font-size: 30px; font-weight: bold; color: #b0180d; margin-bottom: 20px; letter-spacing: 15px;">${otp}</p>
                </td>
            </tr>
        </table>

        <p style="font-size: 13px; font-weight: 550; padding: 20px; text-align: center; color: #747474; margin-bottom: 20px;">Need help? Ask at <a href="mailto:support@ivver.ma" style="text-decoration: none; color: black; font-weight: 600;">support@ivver.ma</a> or visit FAQ</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; text-align: center; font-size: 10px; color: #888;">
            <tr>
                <td style="font-size: 13px; margin-bottom: 10px;">
                    <b style="font-size: 14px; color: rgb(75, 75, 75); font-weight: bold; margin: 10px;">IVVER</b>
                    <br>
                    Address 540, Casablanca, Morocco.
                </td>
            </tr>

            <tr>
                <td style="text-align: center; margin-bottom: 10px;">
                    <a href="" style="text-decoration: none; margin: 0 5px;">
                        <img src="https://i.postimg.cc/zBDvyNXk/svgviewer-png-output.png alt="Facebook" width="25" height="25" />
                    </a>
                    <a href="" style="text-decoration: none; margin: 0 5px;">
                        <img src="https://i.postimg.cc/Qd5HPSyc/svgviewer-png-output-1.png" alt="Instagram" width="25" height="25" />
                    </a>
                    <a href="" style="text-decoration: none; margin: 0 5px;">
                        <img src="https://i.postimg.cc/hGBfqxk6/svgviewer-png-output-2.png" alt="Twitter" width="25" height="25" />
                    </a>
                    <a href="" style="text-decoration: none; margin: 0 5px;">
                        <img src="https://i.postimg.cc/tgN7RJyT/svgviewer-png-output-3.png" alt="Youtube" width="25" height="25" />
                    </a>
                </td>
            </tr>

            <tr>
                <td style="font-size: 12px; margin-top: 10px;">Copyright © 2025 Company. All rights reserved.</td>
            </tr>
        </table>
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
