"use strict";

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerConfig = require("../docs/swagger/swagger.config");

const specs = swaggerJsdoc({
  definition: swaggerConfig,
  apis: [],
});

module.exports = specs;
