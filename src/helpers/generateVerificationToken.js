"use strict";

const jwt = require("jsonwebtoken");

const generateVerificationToken = (user) => {
  return jwt.sign({ userId: user._id }, process.env.VERIFY_KEY, {
    expiresIn: "1d",
  });
};

module.exports = generateVerificationToken;
