"use strict";

const mongoSanitize = require("express-mongo-sanitize");

// Enhanced NoSQL injection protection - READ-ONLY UYUMLU
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

    // Query sanitization - READ-ONLY UYUMLU
    if (req.query && Object.keys(req.query).length > 0) {
      const originalQuery = req.query;
      const cleanQuery = {};

      // 🔒 TEHLİKELİ OPERATÖRLER
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
        // 1. Direkt tehlikeli operatör kontrolü
        if (dangerousOperators.includes(key.toLowerCase())) {
          console.warn(`Blocked dangerous operator: ${key}`);
          continue; // Bu key'i atla
        }

        // 2. Bracket notation kontrolü
        if (key.includes("[") && key.includes("]")) {
          const bracketContent = key.match(/\[(.*?)\]/);
          if (
            bracketContent &&
            dangerousOperators.includes(bracketContent[1].toLowerCase())
          ) {
            console.warn(`Blocked bracket notation: ${key}`);
            continue; // Bu key'i atla
          }
        }

        // 3. Dot notation kontrolü
        if (key.includes(".")) {
          const parts = key.split(".");
          if (
            parts.some((part) =>
              dangerousOperators.includes(part.toLowerCase())
            )
          ) {
            console.warn(`Blocked dot notation: ${key}`);
            continue; // Bu key'i atla
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
            // Değeri sanitize et
            cleanQuery[key] = value
              .replace(/\$/g, "_")
              .replace(/sleep\s*\(/gi, "")
              .replace(/benchmark\s*\(/gi, "")
              .replace(/db\./gi, "");
            continue;
          }
        }

        // 5. Safe key'leri ekle
        cleanQuery[key] = value;
      }

      // 🔧 READ-ONLY ÇÖZÜMÜ: req.query'yi değiştirme, yeni property ekle
      req.sanitizedQuery = cleanQuery;
    }

    next();
  } catch (error) {
    console.error("Sanitize error:", error);
    next(error);
  }
};

module.exports = sanitize;
