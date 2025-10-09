"use strict";

const { Joi } = require("../middlewares/validation");

const loginSchema = Joi.object({
  email: Joi.string().email().required().noSqlInjection().noXss().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().min(8).max(32).required().noSqlInjection().messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password cannot exceed 32 characters",
    "any.required": "Password is required",
  }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().noSqlInjection().messages({
    "any.required": "Refresh token is required",
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().noSqlInjection().noXss().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(32)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,32}$/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must include uppercase, lowercase, number and special character",
      "any.required": "Password is required",
    }),
});

module.exports = {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
