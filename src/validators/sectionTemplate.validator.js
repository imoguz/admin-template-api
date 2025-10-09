const Joi = require("joi");

const createTemplateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  slug: Joi.string().trim().min(1).max(50).required(),
  description: Joi.string().trim().max(200).allow("").optional(),
  icon: Joi.string().trim().max(10).default("📄").optional(),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).optional(),
  slug: Joi.string().trim().min(1).max(50).optional(),
  description: Joi.string().trim().max(200).allow("").optional(),
  icon: Joi.string().trim().max(10).optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
};
