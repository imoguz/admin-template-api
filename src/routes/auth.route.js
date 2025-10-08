"use strict";

const router = require("express").Router();
const { authLimiter } = require("../middlewares/rateLimiter");
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

router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refreshToken);
router.post("/logout", validate(refreshTokenSchema), logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

module.exports = router;
