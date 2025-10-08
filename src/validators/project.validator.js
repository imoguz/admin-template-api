const Joi = require("joi");

const sectionDataSchema = Joi.object({
  // Bu schema'yi section tiplerine göre genişletebilirsiniz
  cards: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().allow("").optional(),
        description: Joi.string().allow("").optional(),
        image: Joi.alternatives()
          .try(
            Joi.string().uri(),
            Joi.object({
              url: Joi.string().uri(),
              publicId: Joi.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
}).unknown(true); // Diğer field'lar strict mode dışında bırak

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
  data: sectionDataSchema.optional(),
});

const updateSectionSchema = Joi.object({
  title: Joi.string().trim().max(100).allow("").optional(),
  isActive: Joi.boolean().optional(),
  data: sectionDataSchema.optional(),
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
