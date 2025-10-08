module.exports = {
  AuthLoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "user@example.com" },
      password: { type: "string", format: "password", example: "P@ssw0rd!" },
    },
  },
  AuthLoginResponse: {
    type: "object",
    properties: {
      accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR..." },
      refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR..." },
      expiresIn: { type: "integer", example: 3600 },
    },
  },
  AuthRefreshRequest: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR..." },
    },
  },
  AuthLogoutRequest: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR..." },
    },
  },
  ForgotPasswordRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email", example: "user@example.com" },
    },
  },
  ResetPasswordRequest: {
    type: "object",
    required: ["password"],
    properties: {
      password: {
        type: "string",
        example: "P@ssw0rd!",
        description:
          "Password: 8-32 chars, mix of uppercase, lowercase, numbers & special chars.",
      },
    },
  },
};
