"use strict";

const path = require("path");
const validator = require("validator");

// Güvenli dosya upload middleware'i
const fileUploadSecurity = (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.file ? [req.file] : req.files || [];

    for (const file of files) {
      // MIME type validation
      const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: true,
          message: "Invalid file type",
        });
      }

      // Filename sanitization
      const sanitizedFilename = path
        .basename(file.originalname)
        .replace(/[^a-zA-Z0-9.\-_]/g, "_")
        .substring(0, 255);

      file.originalname = sanitizedFilename;

      // File size validation (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({
          error: true,
          message: "File size too large. Maximum 10MB allowed.",
        });
      }

      // File content validation (basit magic number check)
      if (file.buffer) {
        // JPEG check
        if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
          if (
            file.buffer.length < 2 ||
            file.buffer[0] !== 0xff ||
            file.buffer[1] !== 0xd8
          ) {
            return res.status(400).json({
              error: true,
              message: "Invalid JPEG file",
            });
          }
        }

        // PNG check
        if (file.mimetype === "image/png") {
          if (
            file.buffer.length < 8 ||
            file.buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a"
          ) {
            return res.status(400).json({
              error: true,
              message: "Invalid PNG file",
            });
          }
        }

        // PDF check
        if (file.mimetype === "application/pdf") {
          if (
            file.buffer.length < 4 ||
            file.buffer.toString("utf8", 0, 4) !== "%PDF"
          ) {
            return res.status(400).json({
              error: true,
              message: "Invalid PDF file",
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error("File upload security error:", error);
    next(error);
  }
};

module.exports = fileUploadSecurity;
