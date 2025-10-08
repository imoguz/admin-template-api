const rateLimit = require("express-rate-limit");

// ✅ DÜZELTİLDİ: skipSuccessfulRequests kaldırıldı
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10, // ✅ ARTIRILDI: 5'ten 10'a çıkarıldı
  message: {
    error: true,
    message: "Too many authentication attempts. Try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // ❌ KALDIRILDI: skipSuccessfulRequests: true
});

// Genel API limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: true,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  authLimiter,
};
