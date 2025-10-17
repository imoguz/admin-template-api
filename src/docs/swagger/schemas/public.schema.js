"use strict";

module.exports = {
  PublicProjectSectionTemplate: {
    type: "object",
    properties: {
      _id: { type: "string", example: "670f4a1b32ab0e4f9b56a7c2" },
      name: { type: "string", example: "Kitchen Cabinets" },
      description: { type: "string", example: "Template description" },
      icon: { type: "string", example: "🧱" },
    },
  },

  PublicProjectSection: {
    type: "object",
    properties: {
      _id: { type: "string", example: "770f4a1b32ab0e4f9b56a7c2" },
      title: { type: "string", example: "Base Cabinets Section" },
      order: { type: "number", example: 0 },
      template: { $ref: "#/components/schemas/PublicProjectSectionTemplate" },
      data: { type: "object", example: { cards: [] } },
    },
  },

  PublicProject: {
    type: "object",
    properties: {
      _id: { type: "string", example: "880f4a1b32ab0e4f9b56a7c2" },
      title: { type: "string", example: "Kitchen Renovation" },
      slug: { type: "string", example: "kitchen-renovation" },
      description: { type: "string", example: "Project description here" },
      thumbnail: {
        type: "object",
        properties: {
          url: { type: "string", example: "https://cdn.example.com/img.jpg" },
        },
      },
      sections: {
        type: "array",
        items: { $ref: "#/components/schemas/PublicProjectSection" },
      },
      createdAt: { type: "string", example: "2025-10-17T08:24:00.000Z" },
      updatedAt: { type: "string", example: "2025-10-17T08:24:00.000Z" },
    },
  },
};
