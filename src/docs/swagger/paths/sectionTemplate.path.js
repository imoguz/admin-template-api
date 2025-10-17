"use strict";

module.exports = {
  "/api/section-templates": {
    get: {
      tags: ["Section Templates"],
      summary: "List all active section templates",
      description:
        "Returns all active section templates in alphabetical order.",
      responses: {
        200: {
          description: "List of templates retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  count: { type: "number", example: 5 },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/SectionTemplate" },
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Section Templates"],
      summary: "Create a new section template",
      security: [{ bearerAuth: [] }],
      description:
        "Creates a new section template. Requires `MANAGE_TEMPLATES` permission.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SectionTemplateCreate" },
          },
        },
      },
      responses: {
        201: {
          description: "Template created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SectionTemplate" },
            },
          },
        },
        409: {
          description: "Template with the same name or slug already exists",
        },
      },
    },
  },

  "/api/section-templates/{id}": {
    get: {
      tags: ["Section Templates"],
      summary: "Get section template by ID",
      description: "Retrieve a single section template by its unique ID.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Section Template ID",
        },
      ],
      responses: {
        200: {
          description: "Template retrieved successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SectionTemplate" },
            },
          },
        },
        404: { description: "Template not found" },
      },
    },
    put: {
      tags: ["Section Templates"],
      summary: "Update a section template",
      security: [{ bearerAuth: [] }],
      description:
        "Update an existing section template. Requires `MANAGE_TEMPLATES` permission.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Section Template ID",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SectionTemplateUpdate" },
          },
        },
      },
      responses: {
        200: { description: "Template updated successfully" },
        404: { description: "Template not found" },
        409: { description: "Name or slug already exists" },
      },
    },
    delete: {
      tags: ["Section Templates"],
      summary: "Delete (soft delete) a section template",
      security: [{ bearerAuth: [] }],
      description:
        "Marks a section template as inactive. Requires `MANAGE_TEMPLATES` permission.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Section Template ID",
        },
      ],
      responses: {
        200: { description: "Template deleted successfully" },
        400: {
          description:
            "Template is in use and cannot be deleted until detached from projects",
        },
        404: { description: "Template not found" },
      },
    },
  },
};
