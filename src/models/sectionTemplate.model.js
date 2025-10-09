"use strict";

const { Schema, model } = require("mongoose");

const sectionTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      default: "📄",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "sectionTemplates",
    timestamps: true,
  }
);

module.exports = model("SectionTemplate", sectionTemplateSchema);
