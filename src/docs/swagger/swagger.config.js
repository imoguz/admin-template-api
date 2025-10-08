"use strict";

const pkg = require("../../../package.json");
const parameters = require("./components/parameters");
const responses = require("./components/responses");
const commonSchemas = require("./schemas/common.schema");
const errorSchemas = require("./schemas/error.schema");
const authPaths = require("./paths/auth.path");
const authSchemas = require("./schemas/auth.schema");
const userPaths = require("./paths/user.path");
const userSchemas = require("./schemas/user.schema");

module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Codencia Legal Consultancy API",
    version: pkg.version,
    description: pkg.description || "API Documentation",
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 8000}/api/v1`,
      description: "Local server",
    },
    {
      url: `${process.env.BACKEND_URL}/api/v1`,
      description: "Production server",
    },
  ],
  tags: [
    { name: "Auth", description: "User authentication operations" },
    { name: "Users", description: "User management operations" },
  ],
  paths: {
    ...authPaths,
    ...userPaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    parameters,
    responses,
    schemas: {
      ...authSchemas,
      ...commonSchemas,
      ...errorSchemas,
      ...userSchemas,
    },
  },
  security: [{ bearerAuth: [] }],
};
