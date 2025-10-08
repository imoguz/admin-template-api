"use strict";

const nodemailer = require("nodemailer");

// Verification email template
const verificationTemplate = (user, token) => {
  return `
    <div>
      <h2>Welcome to ${process.env.EMAIL_FROM}</h2>
      <p>Hi ${user.firstname}, please verify your email address:</p>
      <a href="${process.env.BACKEND_URL}/api/v1/users/verify?token=${token}">
        Verify Your Account
      </a>
    </div>
  `;
};

// Reset password template
const resetPasswordTemplate = (user, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  return `
    <div>
      <h2>Password Reset Request</h2>
      <p>Hi ${user.firstname},</p>
      <p>You requested to reset your password. Click the link below:</p>
      <a href="${resetLink}">Reset Your Password</a>
      <p>If you didn’t request this, ignore this email.</p>
    </div>
  `;
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async ({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM,
}) => {
  const info = await transporter.sendMail({ from, to, subject, html });
};

module.exports = {
  sendEmail,
  verificationTemplate,
  resetPasswordTemplate,
};
