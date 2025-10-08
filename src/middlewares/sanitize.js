const mongoSanitize = require("express-mongo-sanitize");

// Custom query sanitizer (Express 5 uyumlu)
const cleanQuery = (queryObj) => {
  if (!queryObj || typeof queryObj !== "object") return;

  for (const key in queryObj) {
    if (!Object.hasOwn(queryObj, key)) continue;

    const value = queryObj[key];

    // Anahtar injection kontrolü
    if (key.includes("$") || key.includes(".")) {
      delete queryObj[key];
      continue;
    }

    // Değer nested obje ise recursive sanitize
    if (typeof value === "object") {
      cleanQuery(value);
    }

    // String value injection pattern temizliği
    if (typeof value === "string") {
      if (
        value.includes("$") ||
        value.includes("{") ||
        value.includes("sleep(")
      ) {
        queryObj[key] = value
          .replace(/\$/g, "_")
          .replace(/\{/g, "_")
          .replace(/sleep\s*\(/gi, "");
      }
    }
  }
};

const sanitize = (req, res, next) => {
  try {
    // Body sanitize
    if (req.body && Object.keys(req.body).length > 0) {
      mongoSanitize.sanitize(req.body, { replaceWith: "_" });
    }

    // Params sanitize
    if (req.params && Object.keys(req.params).length > 0) {
      mongoSanitize.sanitize(req.params, { replaceWith: "_" });
    }

    // Query sanitize (Express 5 friendly)
    if (req.query && Object.keys(req.query).length > 0) {
      cleanQuery(req.query);
    }

    next();
  } catch (error) {
    console.error("Sanitize error:", error);
    next(error);
  }
};

module.exports = sanitize;
