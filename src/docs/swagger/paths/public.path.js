"use strict";

module.exports = {
  "/api/public/projects": {
    get: {
      tags: ["Public Projects"],
      summary: "List all published projects",
      description:
        "Returns all projects that are published and sanitized for public view.",
      responses: {
        200: {
          description: "List of published projects",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/PublicProject" },
                  },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
        },
      },
    },
  },

  "/api/public/projects/{slug}": {
    get: {
      tags: ["Public Projects"],
      summary: "Get a single published project by slug",
      description:
        "Retrieve a published project and its active sections by its slug.",
      parameters: [
        {
          name: "slug",
          in: "path",
          required: true,
          schema: { type: "string", example: "kitchen-renovation" },
          description: "Slug of the published project",
        },
      ],
      responses: {
        200: {
          description: "Project retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: { $ref: "#/components/schemas/PublicProject" },
                },
              },
            },
          },
        },
        400: { description: "Invalid slug format" },
        404: { description: "Project not found or not published" },
        500: { description: "Server error" },
      },
    },
  },
};
