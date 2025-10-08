const Joi = require("joi");

const createUserSchema = Joi.object({
  firstname: Joi.string().trim().min(1).max(50).required(),
  lastname: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().required().trim(),
  password: Joi.string()
    .min(8)
    .max(32)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/
    )
    .required(),
  profileUrl: Joi.string().uri().allow("", null).optional(),
  role: Joi.string().valid("admin", "staff").optional(),
});

const updateUserSchema = Joi.object({
  firstname: Joi.string().trim().min(1).max(50).optional(),
  lastname: Joi.string().trim().min(1).max(50).optional(),
  email: Joi.string().email().trim().optional(),
  profileUrl: Joi.string().uri().allow("", null).optional(),
  role: Joi.string().valid("admin", "staff").optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
};
