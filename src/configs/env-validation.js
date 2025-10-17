"use strict";

const Joi = require("joi");

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(8000),
  MONGODB: Joi.string().required().description("MongoDB connection string"),
  ACCESS_KEY: Joi.string()
    .min(32)
    .required()
    .description("JWT Access Token Secret"),
  REFRESH_KEY: Joi.string()
    .min(32)
    .required()
    .description("JWT Refresh Token Secret"),

  ALLOWED_ORIGINS: Joi.string().optional(),
  LOGFOLDER: Joi.string().default("./logs"),
}).unknown();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

console.log("Environment variables validated successfully");
console.log(`Environment: ${envVars.NODE_ENV}`);
console.log(`Database: ${envVars.MONGODB ? "Configured" : "Missing"}`);

module.exports = envVars;
