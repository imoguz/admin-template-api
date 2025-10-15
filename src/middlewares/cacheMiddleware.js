"use strict";

const cacheService = require("../services/cache.service");

// Cache response middleware
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Sadece GET request'ler için cache
    if (req.method !== "GET") {
      return next();
    }

    // Cache key oluştur
    const cacheKey = keyGenerator ? keyGenerator(req) : req.originalUrl;

    try {
      // Cache'ten getir
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Original send method'unu override et
      const originalSend = res.send;
      res.send = function (data) {
        // Sadece başarılı response'ları cache'e al
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const responseData =
              typeof data === "string" ? JSON.parse(data) : data;
            cacheService.set(cacheKey, responseData, ttl).catch(console.error);
          } catch (error) {
            console.error("Cache response error:", error);
          }
        }
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
};

// Cache invalidation middleware
const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = async function (data) {
      // Sadece başarılı mutation'lar sonrası cache'i temizle
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
      ) {
        try {
          for (const pattern of patterns) {
            await cacheService.deletePattern(pattern);
          }
          console.log(`Cache invalidated for patterns: ${patterns.join(", ")}`);
        } catch (error) {
          console.error("Cache invalidation error:", error);
        }
      }

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
};
