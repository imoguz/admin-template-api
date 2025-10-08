module.exports = {
  "/auth/login": {
    post: {
      summary: "Login user",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AuthLoginRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Login successful",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthLoginResponse" },
            },
          },
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },

  "/auth/refresh-token": {
    post: {
      summary: "Refresh access token",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AuthRefreshRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Token refreshed successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthLoginResponse" },
            },
          },
        },
        400: { $ref: "#/components/responses/BadRequest" },
        403: { $ref: "#/components/responses/Forbidden" },
      },
    },
  },

  "/auth/logout": {
    post: {
      summary: "Logout user (invalidate refresh token)",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AuthLogoutRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Logout successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Logged out successfully.",
                  },
                },
              },
            },
          },
        },
        400: { $ref: "#/components/responses/BadRequest" },
      },
    },
  },

  "/auth/forgot-password": {
    post: {
      summary: "Send password reset email",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ForgotPasswordRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "If email exists, reset link sent",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example:
                      "If an account with this email exists, a reset link has been sent.",
                  },
                },
              },
            },
          },
        },
        400: { $ref: "#/components/responses/BadRequest" },
      },
    },
  },

  "/auth/reset-password": {
    post: {
      summary: "Reset user password",
      tags: ["Auth"],
      parameters: [
        {
          in: "query",
          name: "token",
          required: true,
          schema: { type: "string" },
          description: "Password reset token",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Password reset successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Password has been reset successfully.",
                  },
                },
              },
            },
          },
        },
        400: { $ref: "#/components/responses/BadRequest" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
