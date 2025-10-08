"use strict";

const mongoose = require("mongoose");

const dbConnection = () => {
  mongoose
    .connect(process.env.MONGODB)
    .then(() => console.log("Successfully connected to MongoDB database"))
    .catch((err) => console.log("Connection error:", err?.message));
};

module.exports = dbConnection;
