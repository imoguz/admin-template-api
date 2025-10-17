module.exports = {
  Project: {
    type: "object",
    properties: {
      _id: { type: "string" },
      title: { type: "string" },
      slug: { type: "string" },
      description: { type: "string" },
      thumbnail: {
        type: "object",
        properties: {
          url: { type: "string" },
          publicId: { type: "string" },
        },
      },
      sections: {
        type: "array",
        items: { $ref: "#/components/schemas/Section" },
      },
      isPublished: { type: "boolean" },
      createdBy: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  ProjectUpdateInput: {
    type: "object",
    properties: {
      title: { type: "string" },
      slug: { type: "string" },
      description: { type: "string" },
      isPublished: { type: "boolean" },
    },
  },

  Section: {
    type: "object",
    properties: {
      _id: { type: "string" },
      template: { type: "string" },
      title: { type: "string" },
      order: { type: "integer" },
      data: { type: "object" },
      isActive: { type: "boolean" },
    },
  },

  SectionInput: {
    type: "object",
    properties: {
      template: { type: "string" },
      title: { type: "string" },
      data: { type: "object" },
    },
    required: ["template"],
  },

  SectionUpdateInput: {
    type: "object",
    properties: {
      title: { type: "string" },
      data: { type: "object" },
      isActive: { type: "boolean" },
      "cards[0][image]": { type: "string", format: "binary" },
    },
  },
};
