module.exports = {
  User: {
    type: "object",
    properties: {
      _id: { type: "string", example: "64fa8e72e2d4e1a1c2345678" },
      firstname: { type: "string", example: "John" },
      lastname: { type: "string", example: "Doe" },
      email: { type: "string", format: "email", example: "john@example.com" },
      profileUrl: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/profile.jpg",
      },
      role: {
        type: "string",
        enum: ["admin", "staff"],
        example: "staff",
      },
      isActive: { type: "boolean", example: true },
      isDeleted: { type: "boolean", example: false },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  CreateUserInput: {
    type: "object",
    required: ["firstname", "lastname", "email", "password"],
    properties: {
      firstname: { type: "string", example: "John" },
      lastname: { type: "string", example: "Doe" },
      email: { type: "string", format: "email", example: "john@example.com" },
      password: {
        type: "string",
        example: "StrongP@ssw0rd",
        description:
          "8-32 chars, must include uppercase, lowercase, number, and special character.",
      },
      profileUrl: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/profile.jpg",
      },
      role: {
        type: "string",
        enum: ["admin", "staff"],
        example: "staff",
      },
    },
  },

  UpdateUserInput: {
    type: "object",
    properties: {
      firstname: { type: "string", example: "John" },
      lastname: { type: "string", example: "Doe" },
      email: { type: "string", format: "email", example: "john@example.com" },
      password: {
        type: "string",
        example: "StrongP@ssw0rd",
        description: "Optional; must meet password policy if provided.",
      },
      profileUrl: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/profile.jpg",
      },
      role: {
        type: "string",
        enum: ["admin", "staff"],
        example: "staff",
      },
      isActive: { type: "boolean", example: true },
    },
  },
};
