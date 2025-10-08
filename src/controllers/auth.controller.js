"use strict";

const jwt = require("jsonwebtoken");
const setJWT = require("../helpers/setJWT");
const TokenBlacklist = require("../models/tokenBlacklist.model");
const User = require("../models/user.model");
const { sendEmail, resetPasswordTemplate } = require("../helpers/sendEmail");

module.exports = {
  login: async (req, res) => {
    try {
      const data = await setJWT(req.body);
      res.send(data);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  },

  refreshToken: async (req, res) => {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).send({ error: "Refresh token required." });
    }

    const isBlacklisted = await TokenBlacklist.findOne({ token: refreshToken });
    if (isBlacklisted) {
      return res.status(403).send({ error: "Token is blacklisted." });
    }

    jwt.verify(refreshToken, process.env.REFRESH_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).send({ error: "Invalid refresh token." });
      }

      try {
        const data = await setJWT({ userId: decoded.id }, refreshToken);
        res.send(data);
      } catch (err) {
        res.status(401).send({ error: err.message });
      }
    });
  },

  logout: async (req, res) => {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).send({ error: "Refresh token is required." });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_KEY);

      await TokenBlacklist.create({
        token: refreshToken,
        expiresAt: new Date(decoded.exp * 1000),
      });

      res.send({ message: "Logged out successfully." });
    } catch (err) {
      res.status(400).send({ error: "Invalid token." });
    }
  },

  forgotPassword: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    try {
      const user = await User.findOne({ email });

      if (user) {
        const token = jwt.sign(
          { id: user._id },
          process.env.RESET_PASSWORD_SECRET,
          {
            expiresIn: "1h",
          }
        );

        const html = resetPasswordTemplate(user, token);

        await sendEmail({
          to: user.email,
          subject: "Reset Your Password",
          html,
        });
      }

      res.json({
        message:
          "If an account with this email exists, a reset link has been sent.",
      });
    } catch (err) {
      res.status(500).json({ error: "Something went wrong." });
    }
  },

  resetPassword: async (req, res) => {
    const { token } = req.query;
    const { password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: "Token and new password are required." });
    }

    try {
      const decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?`~\-])[A-Za-z\d!@#$%^&*()_+[\]{};':"\\|,.<>/?`~\-]{8,32}$/;

      if (!passwordRegex.test(password)) {
        throw new Error(
          "Password must be 8-32 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
        );
      }

      user.password = password;
      await user.save();

      res.json({ message: "Password has been reset successfully." });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(400).json({ error: "Reset link has expired." });
      }

      res.status(400).json({ error: "Invalid or expired token." });
    }
  },
};
