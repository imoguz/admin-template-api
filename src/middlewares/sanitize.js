"use strict";

const mongoSanitize = require("express-mongo-sanitize");

// NoSQL injection protection
const sanitize = (req, res, next) => {
  try {
    // Body sanitization with deep sanitize
    if (req.body && Object.keys(req.body).length > 0) {
      mongoSanitize.sanitize(req.body, {
        replaceWith: "_",
        allowDots: false,
      });
    }

    // Params sanitization
    if (req.params && Object.keys(req.params).length > 0) {
      mongoSanitize.sanitize(req.params, {
        replaceWith: "_",
        allowDots: false,
      });
    }

    // Query sanitization - READ-ONLY
    if (req.query && Object.keys(req.query).length > 0) {
      const originalQuery = req.query;
      const cleanQuery = {};

      // Dangerous Operators
      const dangerousOperators = [
        "$where",
        "$eval",
        "$accumulator",
        "$function",
        "$code",
        "$regex",
        "$options",
        "$text",
        "$search",
        "$ne",
        "$gt",
        "$lt",
        "$gte",
        "$lte",
        "$in",
        "$nin",
        "$exists",
        "$type",
        "$mod",
        "$size",
        "$all",
        "$elemMatch",
        "$not",
        "$expr",
        "$jsonSchema",
      ];

      for (const [key, value] of Object.entries(originalQuery)) {
        // 1. dangerous operators
        if (dangerousOperators.includes(key.toLowerCase())) {
          console.warn(`Blocked dangerous operator: ${key}`);
          continue;
        }

        // 2. Bracket notation
        if (key.includes("[") && key.includes("]")) {
          const bracketContent = key.match(/\[(.*?)\]/);
          if (
            bracketContent &&
            dangerousOperators.includes(bracketContent[1].toLowerCase())
          ) {
            console.warn(`Blocked bracket notation: ${key}`);
            continue;
          }
        }

        // 3. Dot notation
        if (key.includes(".")) {
          const parts = key.split(".");
          if (
            parts.some((part) =>
              dangerousOperators.includes(part.toLowerCase())
            )
          ) {
            console.warn(`Blocked dot notation: ${key}`);
            continue;
          }
        }

        // 4. Value sanitization
        if (typeof value === "string") {
          const dangerousPatterns = [
            /\$where/i,
            /\$eval/i,
            /\$accumulator/i,
            /\$function/i,
            /sleep\s*\(/i,
            /benchmark\s*\(/i,
            /db\./i,
            /this\./i,
            /constructor/i,
            /proto/i,
            /onload/i,
          ];

          if (dangerousPatterns.some((pattern) => pattern.test(value))) {
            // sanitize value
            cleanQuery[key] = value
              .replace(/\$/g, "_")
              .replace(/sleep\s*\(/gi, "")
              .replace(/benchmark\s*\(/gi, "")
              .replace(/db\./gi, "");
            continue;
          }
        }

        // 5. Add Safe keys
        cleanQuery[key] = value;
      }

      // READ-ONLY
      req.sanitizedQuery = cleanQuery;
    }

    next();
  } catch (error) {
    console.error("Sanitize error:", error);
    next(error);
  }
};

module.exports = sanitize;
