module.exports = {
  page: {
    in: "query",
    name: "page",
    schema: { type: "integer", minimum: 1, default: 1 },
    description: "Page number for pagination.",
  },
  limit: {
    in: "query",
    name: "limit",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    description: "Number of items per page (max 100).",
  },
  sortBy: {
    in: "query",
    name: "sortBy",
    schema: { type: "string", default: "createdAt" },
    description: "Comma-separated fields to sort by. Example: createdAt,title",
  },
  sortOrder: {
    in: "query",
    name: "sortOrder",
    schema: { type: "string", default: "desc", enum: ["asc", "desc"] },
    description: "Sorting order for each sortBy field. Example: desc,asc",
  },
  search: {
    in: "query",
    name: "search",
    schema: { type: "string" },
    description: "Search term to filter results.",
  },
  filters: {
    in: "query",
    name: "filters",
    schema: { type: "object", additionalProperties: { type: "string" } },
    style: "deepObject",
    explode: true,
    description: "Key-value filters. Example: filters[status]=active",
  },
  id: {
    in: "path",
    name: "id",
    required: true,
    schema: { type: "string" },
    description: "Resource ID",
    example: "66545791f8545c2b3f6f47df",
  },
};
