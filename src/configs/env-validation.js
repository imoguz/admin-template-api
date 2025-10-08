"use strict";

const Joi = require("joi");

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("production"),
  PORT: Joi.number().port().default(8000),
  MONGODB: Joi.string().uri().required(),
  ACCESS_KEY: Joi.string().min(32).required(),
  REFRESH_KEY: Joi.string().min(32).required(),
  ALLOWED_ORIGINS: Joi.string().optional(),
  LOGFOLDER: Joi.string().default("./logs"),
})
  .unknown()
  .required(); // Tüm environment variables required

const { error, value: envVars } = envVarsSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: true,
});

if (error) {
  const errorMessage = error.details.map((detail) => detail.message).join(", ");
  throw new Error(`Environment validation failed: ${errorMessage}`);
}

// Production için ek kontroller
if (envVars.NODE_ENV === "production") {
  if (!envVars.MONGODB.includes("mongodb://")) {
    throw new Error(
      "MONGODB must be a valid MongoDB connection string in production"
    );
  }

  if (envVars.ACCESS_KEY === "your-super-secure-access-key-min-32-chars") {
    throw new Error("Please set a secure ACCESS_KEY in production");
  }
}

console.log("Environment variables validated successfully");
console.log(`Environment: ${envVars.NODE_ENV}`);
console.log(`Database: ${envVars.MONGODB ? "Configured" : "Missing"}`);
