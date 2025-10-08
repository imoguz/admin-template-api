"use strict";

const morgan = require("morgan");
const fs = require("fs");
const LOGFOLDER = process.env.LOGFOLDER;

// Creating logs folder
fs.mkdirSync(LOGFOLDER, { recursive: true });

// Logging and recording HTTP requests with Morgan
module.exports = morgan("combined", {
  stream: fs.createWriteStream(
    LOGFOLDER +
      "/" +
      new Date().toLocaleDateString().replace(/\//g, "-") +
      ".log",
    { flags: "a" }
  ),
});
