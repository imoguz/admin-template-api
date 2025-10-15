"use strict";

const DOMPurify = require("isomorphic-dompurify");

// XSS temizleme konfigürasyonu
const sanitizeConfig = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  FORBID_TAGS: ["script", "style", "iframe", "form", "object", "embed"],
  FORBID_ATTR: ["onclick", "onload", "onerror", "style"],
};

// Recursive deep sanitization fonksiyonu
const deepSanitize = (obj) => {
  if (!obj || typeof obj !== "object") {
    return typeof obj === "string"
      ? DOMPurify.sanitize(obj, sanitizeConfig)
      : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = deepSanitize(value);
  }
  return sanitized;
};

const xssSanitize = (req, res, next) => {
  try {
    // Body sanitization
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = deepSanitize(req.body);
      req.body = { ...req.body, ...sanitizedBody };
    }

    // Query sanitization - read-only
    if (req.query && Object.keys(req.query).length > 0) {
      const sanitizedQuery = deepSanitize(req.query);

      Object.keys(sanitizedQuery).forEach((key) => {
        if (req.query[key] !== sanitizedQuery[key]) {
          try {
            req.query[key] = sanitizedQuery[key];
          } catch (e) {
            console.warn(
              `Query parameter ${key} is read-only, skipping sanitization`
            );
          }
        }
      });
    }

    // Params sanitization - read-only
    if (req.params && Object.keys(req.params).length > 0) {
      Object.keys(req.params).forEach((key) => {
        if (typeof req.params[key] === "string") {
          try {
            const sanitizedValue = DOMPurify.sanitize(
              req.params[key],
              sanitizeConfig
            );
            req.params[key] = sanitizedValue;
          } catch (e) {
            console.warn(`Param ${key} is read-only, skipping sanitization`);
          }
        }
      });
    }

    next();
  } catch (error) {
    console.error("XSS Sanitization error:", error);
    next(error);
  }
};

module.exports = xssSanitize;
