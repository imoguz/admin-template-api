"use strict";

const Joi = require("joi");

// Enhanced Joi validation with security features
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      if (!schema) {
        return next();
      }

      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false, // Unknown fields not allowed
      });

      if (error) {
        const errorDetails = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message.replace(/['"]/g, ""),
          type: detail.type,
        }));

        console.warn("Validation failed:", {
          ip: req.ip,
          path: req.path,
          errors: errorDetails,
        });

        return res.status(400).json({
          error: true,
          message: "Validation failed",
          details: errorDetails,
        });
      }

      // Validated and sanitized values
      req[source] = value;
      next();
    } catch (validationError) {
      console.error("Validation middleware error:", validationError);
      return res.status(500).json({
        error: true,
        message: "Validation error occurred",
      });
    }
  };
};

// Custom Joi validations
const customJoi = Joi.extend((joi) => ({
  type: "string",
  base: joi.string(),
  messages: {
    "string.noSqlInjection":
      "{{#label}} contains potentially dangerous content",
    "string.noXss":
      "{{#label}} contains potentially dangerous HTML/script content",
  },
  rules: {
    noSqlInjection: {
      validate(value, helpers) {
        const dangerousPatterns = [
          /\$where/i,
          /\$eval/i,
          /\$accumulator/i,
          /\$function/i,
          /sleep\s*\(/i,
          /benchmark\s*\(/i,
          /db\./i,
        ];

        if (dangerousPatterns.some((pattern) => pattern.test(value))) {
          return helpers.error("string.noSqlInjection");
        }
        return value;
      },
    },
    noXss: {
      validate(value, helpers) {
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /expression\s*\(/gi,
        ];

        if (xssPatterns.some((pattern) => pattern.test(value))) {
          return helpers.error("string.noXss");
        }
        return value;
      },
    },
    sanitizedHtml: {
      validate(value, helpers) {
        // Basic HTML tag validation
        const allowedTags = [
          "b",
          "i",
          "em",
          "strong",
          "p",
          "br",
          "ul",
          "ol",
          "li",
        ];
        const tagRegex = /<(\w+)[^>]*>/g;
        let match;

        while ((match = tagRegex.exec(value)) !== null) {
          if (!allowedTags.includes(match[1].toLowerCase())) {
            return helpers.error("string.noXss");
          }
        }
        return value;
      },
    },
  },
}));

module.exports = validate;
module.exports.Joi = customJoi;
