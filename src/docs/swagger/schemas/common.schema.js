module.exports = {
  PaginationMeta: {
    type: "object",
    properties: {
      total: { type: "integer", example: 150 },
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 20 },
      totalPages: { type: "integer", example: 8 },
      hasNextPage: { type: "boolean", example: true },
      hasPrevPage: { type: "boolean", example: false },
    },
  },
  PaginatedResponse: {
    type: "object",
    properties: {
      data: { type: "array", items: { type: "object" } },
      pagination: { $ref: "#/components/schemas/PaginationMeta" },
    },
  },
};
