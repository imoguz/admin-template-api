const Joi = require("joi");

// Mixed data schema
const sectionDataSchema = Joi.any().default({});

const createProjectSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  slug: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Slug can only contain lowercase letters, numbers, and hyphens",
    }),
  description: Joi.string().trim().max(500).allow("").optional(),
});

const updateProjectSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).optional(),
  slug: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-z0-9-]+$/)
    .optional(),
  description: Joi.string().trim().max(500).allow("").optional(),
});

const addSectionSchema = Joi.object({
  template: Joi.string()
    .valid(
      "header",
      "hero",
      "contact-form",
      "services",
      "testimonials",
      "video-showcase",
      "featured-product",
      "statistics",
      "top-choice",
      "cta-banner",
      "how-it-works",
      "best-choice",
      "highlights",
      "faq",
      "footer"
    )
    .required(),
  title: Joi.string().trim().max(100).allow("").optional(),
  data: sectionDataSchema,
});

const updateSectionSchema = Joi.object({
  title: Joi.string().trim().max(100).allow("").optional(),
  isActive: Joi.boolean().optional(),
  data: sectionDataSchema,
});

const reorderSectionsSchema = Joi.object({
  order: Joi.array().items(Joi.string().hex().length(24)).required(),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  addSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
};
