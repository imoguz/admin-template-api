"use strict";

const router = require("express").Router();
const authRateLimiter = require("../middlewares/authRateLimiter"); // YENİ - custom rate limiter
const validate = require("../middlewares/validation");
const {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator");

const {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");

// ÖZEL: Sadece validation'dan geçmiş login attempt'ler için custom rate limiter
router.post("/login", authRateLimiter, validate(loginSchema), login);

// Diğer auth endpoint'leri için genel rate limiting (opsiyonel)
router.post("/refresh", validate(refreshTokenSchema), refreshToken);
router.post("/logout", validate(refreshTokenSchema), logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

module.exports = router;
