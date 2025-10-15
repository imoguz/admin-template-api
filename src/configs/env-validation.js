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

  // Redis Configuration
  REDIS_URL: Joi.string().optional(),
  REDIS_URL_DEVELOPMENT: Joi.string()
    .optional()
    .default("redis://localhost:6379"),
  REDIS_URL_PRODUCTION: Joi.string().optional().default("redis://redis:6379"),
  REDIS_TTL: Joi.number().default(3600),
  REDIS_PASSWORD: Joi.string().optional().allow(""),
  REDIS_DB: Joi.number().default(0),

  ALLOWED_ORIGINS: Joi.string().optional(),
  LOGFOLDER: Joi.string().default("./logs"),

  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
}).unknown();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

// Select Redis URL
if (!envVars.REDIS_URL) {
  if (envVars.NODE_ENV === "production") {
    envVars.REDIS_URL = envVars.REDIS_URL_PRODUCTION;
  } else {
    envVars.REDIS_URL = envVars.REDIS_URL_DEVELOPMENT;
  }
}

// Add password to URL
if (envVars.REDIS_PASSWORD && envVars.REDIS_PASSWORD !== "") {
  const url = new URL(envVars.REDIS_URL);
  url.username = "default";
  url.password = envVars.REDIS_PASSWORD;
  envVars.REDIS_URL = url.toString();
}

console.log("Environment variables validated successfully");
console.log(`Environment: ${envVars.NODE_ENV}`);
console.log(`Database: ${envVars.MONGODB ? "Configured" : "Missing"}`);
console.log(`Redis: ${envVars.REDIS_URL.replace(/:[^:]*?@/, ":****@")}`);

module.exports = envVars;
