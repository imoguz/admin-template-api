"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

module.exports = async ({ email, password, userId }, refreshToken = null) => {
  let user;

  // Login - if email and password exist
  if (email && password) {
    user = await User.findOne({ email }).select("+password");
    if (!user || !user.isActive) {
      throw new Error("Account is not active. Please contact support.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error("Invalid credentials.");
    }
  }

  // Refresh - if only userId exist
  if (userId) {
    user = await User.findById(userId);
    if (!user || !user.isActive || !user.isVerified) {
      throw new Error("Invalid refresh token.");
    }
  }

  // Create jwt-token
  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.ACCESS_KEY,
    { expiresIn: "30m" }
  );

  const newRefreshToken =
    refreshToken ||
    jwt.sign({ id: user._id }, process.env.REFRESH_KEY, {
      expiresIn: "1d",
    });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user._id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      profileUrl: user.profileUrl,
    },
  };
};
