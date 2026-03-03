const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendResetEmail(to, resetLink) {
  await transporter.sendMail({
    from: `"Shri Manjunatha" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password.</p>
        <p>Click the button below to reset:</p>

        <a href="${resetLink}" 
           style="display:inline-block;padding:10px 15px;
           background:#4285F4;color:white;text-decoration:none;
           border-radius:5px;">
           Reset Password
        </a>

        <p>This link will expire in 1 hour.</p>

        <p>If you did not request this, ignore this email.</p>
      </div>
    `
  });
}

module.exports = { sendResetEmail };