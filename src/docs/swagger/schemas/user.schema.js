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
        enum: ["admin", "manager", "staff", "client"],
        example: "client",
      },
      position: {
        type: "string",
        enum: ["lawyer", "assistant", "paralegal", "intern", null],
        nullable: true,
        example: "lawyer",
        description: "Only non-client roles can have a position",
      },
      isVerified: { type: "boolean", example: false },
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
      password: { type: "string", example: "StrongP@ssw0rd" },
      profileUrl: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/profile.jpg",
      },
      role: {
        type: "string",
        enum: ["admin", "manager", "staff", "client"],
        example: "client",
      },
      position: {
        type: "string",
        enum: ["lawyer", "assistant", "paralegal", "intern", null],
        nullable: true,
        example: null,
        description: "Ignored if role is client",
      },
    },
  },
  UpdateUserInput: {
    type: "object",
    properties: {
      firstname: { type: "string", example: "John" },
      lastname: { type: "string", example: "Doe" },
      email: { type: "string", format: "email", example: "john@example.com" },
      password: { type: "string", example: "StrongP@ssw0rd" },
      profileUrl: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/profile.jpg",
      },
      role: {
        type: "string",
        enum: ["admin", "manager", "staff", "client"],
        example: "client",
      },
      position: {
        type: "string",
        enum: ["lawyer", "assistant", "paralegal", "intern", null],
        nullable: true,
        example: "lawyer",
        description: "Ignored if role is client",
      },
      isActive: { type: "boolean", example: true },
    },
  },
};
