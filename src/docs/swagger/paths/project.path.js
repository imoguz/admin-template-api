module.exports = {
  "/projects": {
    get: {
      tags: ["Project"],
      summary: "List all projects",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "List of projects",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Project" },
                  },
                },
              },
            },
          },
        },
      },
    },

    post: {
      tags: ["Project"],
      summary: "Create a new project",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                slug: { type: "string" },
                description: { type: "string" },
                thumbnail: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Project created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Project" },
            },
          },
        },
        400: { description: "Invalid input" },
        409: { description: "Slug already exists" },
      },
    },
  },

  "/projects/{id}": {
    get: {
      tags: ["Project"],
      summary: "Get project by ID",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Project details",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Project" },
            },
          },
        },
        404: { description: "Project not found" },
      },
    },

    put: {
      tags: ["Project"],
      summary: "Update project by ID",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ProjectUpdateInput" },
          },
        },
      },
      responses: {
        200: { description: "Project updated successfully" },
        404: { description: "Project not found" },
      },
    },

    delete: {
      tags: ["Project"],
      summary: "Delete a project",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Project deleted successfully" },
        404: { description: "Project not found" },
      },
    },
  },

  "/projects/slug/{slug}": {
    get: {
      tags: ["Project"],
      summary: "Get project by slug",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "slug",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Project details by slug",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Project" },
            },
          },
        },
        404: { description: "Project not found" },
      },
    },
  },

  // ---------- Sections ----------
  "/projects/{id}/sections": {
    post: {
      tags: ["Project Sections"],
      summary: "Add a new section to a project",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SectionInput" },
          },
        },
      },
      responses: {
        201: {
          description: "Section created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Section" },
            },
          },
        },
      },
    },
  },

  "/projects/{id}/sections/reorder": {
    put: {
      tags: ["Project Sections"],
      summary: "Reorder project sections",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                order: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Sections reordered successfully" },
      },
    },
  },

  "/projects/{id}/sections/{sectionId}": {
    put: {
      tags: ["Project Sections"],
      summary: "Update a project section",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
        {
          in: "path",
          name: "sectionId",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: { $ref: "#/components/schemas/SectionUpdateInput" },
          },
        },
      },
      responses: {
        200: { description: "Section updated successfully" },
      },
    },

    delete: {
      tags: ["Project Sections"],
      summary: "Delete a project section",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
        {
          in: "path",
          name: "sectionId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Section deleted successfully" },
      },
    },
  },
};
