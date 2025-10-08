"use strict";

// Tehlikeli MongoDB operatörleri
const DANGEROUS_OPERATORS = [
  "$where",
  "$eval",
  "$accumulator",
  "$function",
  "$code",
  "$regex",
  "$options",
  "$text",
  "$search",
];

// Tehlikeli string pattern'ler
const DANGEROUS_PATTERNS = [
  "sleep",
  "benchmark",
  "db.currentOp",
  "db.killOp",
  "db.adminCommand",
];

const hasDangerousContent = (obj) => {
  if (!obj || typeof obj !== "object") return false;

  for (const [key, value] of Object.entries(obj)) {
    // Key kontrolü
    if (
      DANGEROUS_OPERATORS.some((op) =>
        key.toLowerCase().includes(op.toLowerCase())
      )
    ) {
      return true;
    }

    // Value kontrolü
    if (typeof value === "string") {
      if (
        DANGEROUS_PATTERNS.some((pattern) =>
          value.toLowerCase().includes(pattern.toLowerCase())
        )
      ) {
        return true;
      }
    }

    // Nested object kontrolü
    if (typeof value === "object" && value !== null) {
      if (hasDangerousContent(value)) {
        return true;
      }
    }
  }

  return false;
};

const queryHandler = (req, res, next) => {
  try {
    const {
      filter = {},
      search = "",
      searchFields = [],
      sort = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 25,
      populate = "",
      select = "",
    } = req.query;

    // 🔒 GÜVENLİK KONTROLÜ - Query'de tehlikeli içerik var mı?
    if (hasDangerousContent(req.query)) {
      console.warn(`Blocked dangerous query from IP: ${req.ip}`, req.query);
      return res.status(400).json({
        error: true,
        message: "Invalid query parameters detected",
      });
    }

    // Build the database query
    let dbQuery = {};

    // Search logic
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map((field) => ({
        [field]: { $regex: search, $options: "i" },
      }));
      dbQuery.$or = searchConditions;
    }

    // Filter logic - SADECE basit equality filtreleri
    if (filter && typeof filter === "object") {
      Object.keys(filter).forEach((key) => {
        // Sadece güvenli key'lere izin ver (nokta ve dolar işareti yok)
        if (
          !key.includes(".") &&
          !key.includes("$") &&
          filter[key] !== undefined &&
          filter[key] !== ""
        ) {
          dbQuery[key] = filter[key];
        }
      });
    }

    // Build options
    const options = {
      sort: { [sort]: sortOrder === "desc" ? -1 : 1 },
      lean: true,
      page: parseInt(page),
      limit: parseInt(limit) > 100 ? 100 : parseInt(limit),
    };

    // Populate
    if (populate) {
      options.populate = populate;
    }

    // Select
    if (select) {
      options.select = select;
    }

    // Attach to request
    req.dbQuery = dbQuery;
    req.queryOptions = options;

    next();
  } catch (error) {
    console.error("Query handler error:", error);
    return res.status(400).json({
      error: true,
      message: "Invalid query parameters",
    });
  }
};

module.exports = queryHandler;
