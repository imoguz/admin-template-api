"use strict";

module.exports = {
  SectionTemplate: {
    type: "object",
    properties: {
      _id: { type: "string", example: "670f4a1b32ab0e4f9b56a7c2" },
      name: { type: "string", example: "Kitchen Cabinets" },
      slug: { type: "string", example: "kitchen-cabinets" },
      description: {
        type: "string",
        example: "Cabinet section templates for kitchen layouts.",
      },
      icon: { type: "string", example: "🧱" },
      isActive: { type: "boolean", example: true },
      createdAt: { type: "string", example: "2025-10-17T08:24:00.000Z" },
      updatedAt: { type: "string", example: "2025-10-17T08:24:00.000Z" },
    },
  },

  SectionTemplateCreate: {
    type: "object",
    required: ["name", "slug"],
    properties: {
      name: { type: "string", example: "Base Cabinets" },
      slug: { type: "string", example: "base-cabinets" },
      description: { type: "string", example: "Lower storage cabinet units" },
      icon: { type: "string", example: "🪵" },
    },
  },

  SectionTemplateUpdate: {
    type: "object",
    properties: {
      name: { type: "string", example: "Updated Name" },
      slug: { type: "string", example: "updated-slug" },
      description: { type: "string", example: "Updated description" },
      icon: { type: "string", example: "📄" },
      isActive: { type: "boolean", example: true },
    },
  },
};
