"use strict";

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const err = new Error("Authorization token is missing or malformed");
      err.statusCode = 401;
      throw err;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_KEY);

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      err.statusCode = 401;
      err.message = "Access token expired";
    } else if (err.name === "JsonWebTokenError") {
      err.statusCode = 401;
      err.message = "Invalid token";
    }
    next(err);
  }
};
