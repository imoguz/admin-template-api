"use strict";

const { Schema, model } = require("mongoose");
const validator = require("validator");
const { hashPassword, comparePassword } = require("../helpers/passwordEncrypt");

const userSchema = new Schema(
  {
    firstname: {
      type: String,
      required: true,
      trim: true,
    },

    lastname: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: validator.isEmail,
        message: "Please enter a valid email address.",
      },
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    profileUrl: {
      type: String,
      trim: true,
      default: null,
    },

    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "staff",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "users",
    timestamps: true,
  }
);

// Hashing the password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?`~\-])[A-Za-z\d!@#$%^&*()_+[\]{};':"\\|,.<>/?`~\-]{8,32}$/;

  if (!passwordRegex.test(this.password)) {
    throw new Error(
      "Password: 8-32 chars, mix of uppercase, lowercase, numbers & special chars."
    );
  }

  this.password = await hashPassword(this.password);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function (plainPassword) {
  return await comparePassword(plainPassword, this.password);
};

module.exports = model("User", userSchema);
