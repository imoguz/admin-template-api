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
const projectPaths = require("./paths/project.path");
const projectSchemas = require("./schemas/project.schema");
const sectionTemplatePaths = require("./paths/sectionTemplate.path");
const sectionTemplateSchemas = require("./schemas/sectionTemplateschema");
const publicPaths = require("./paths/public.path");
const publicSchemas = require("./schemas/public.schema");

module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Landing Page Template Api",
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
    ...projectPaths,
    ...sectionTemplatePaths,
    ...publicPaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    parameters,
    responses,
    schemas: {
      ...commonSchemas,
      ...errorSchemas,
      ...authSchemas,
      ...userSchemas,
      ...projectSchemas,
      ...sectionTemplateSchemas,
      ...publicSchemas,
    },
  },
  security: [{ bearerAuth: [] }],
};
