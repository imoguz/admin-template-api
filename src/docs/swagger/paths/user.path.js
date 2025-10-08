module.exports = {
  "/users": {
    post: {
      summary: "Create a new user",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateUserInput" },
          },
        },
      },
      responses: {
        201: {
          description: "User created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
    get: {
      summary: "Get list of users (admin only)",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/page" },
        { $ref: "#/components/parameters/limit" },
        { $ref: "#/components/parameters/sortBy" },
        { $ref: "#/components/parameters/sortOrder" },
        { $ref: "#/components/parameters/search" },
        { $ref: "#/components/parameters/filters" },
      ],
      responses: {
        200: {
          description: "Paginated list of users",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/PaginatedResponse" },
                  {
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
      },
    },
  },

  "/users/verify": {
    get: {
      summary: "Verify a user account via token",
      tags: ["Users"],
      parameters: [
        {
          in: "query",
          name: "token",
          schema: { type: "string" },
          required: true,
          description: "Verification token sent via email",
        },
      ],
      responses: {
        302: { description: "Redirect to frontend verification result page" },
        400: { $ref: "#/components/responses/BadRequest" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },

  "/users/staff": {
    get: {
      summary: "Get all active staff users with assignable positions",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "List of staff users",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    _id: { type: "string" },
                    firstname: { type: "string" },
                    lastname: { type: "string" },
                    position: { type: "string" },
                    profileUrl: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
      },
    },
  },

  "/users/{id}": {
    get: {
      summary: "Get a single user by ID",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/id" }],
      responses: {
        200: {
          description: "User data",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
    put: {
      summary: "Update a user",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/id" }],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateUserInput" },
          },
        },
      },
      responses: {
        202: {
          description: "User updated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      summary: "Soft delete a user (mark as deleted)",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/id" }],
      responses: {
        204: { description: "User marked as deleted" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },

  "/users/purge/{id}": {
    delete: {
      summary: "Permanently delete a user (admin only)",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/id" }],
      responses: {
        204: { description: "User permanently deleted" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
