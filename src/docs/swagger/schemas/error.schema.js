module.exports = {
  ErrorResponse: {
    type: "object",
    required: ["statusCode", "message"],
    properties: {
      statusCode: {
        type: "integer",
        example: 400,
        description: "HTTP durum kodu",
      },
      message: {
        type: "string",
        example: "Bad request: missing required field",
        description: "Error message",
      },
      errors: {
        type: "object",
        nullable: true,
        additionalProperties: {
          type: "string",
        },
        example: {
          email: "Must be a valid email address",
          password: "Password must be at least 8 characters",
        },
        description: "Field-based validation errors (optional)",
      },
    },
    example: {
      statusCode: 400,
      message: "Validation failed",
      errors: {
        email: "Must be a valid email address",
        password: "Password must contain at least one number",
      },
    },
  },
};
