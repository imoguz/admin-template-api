"use strict";

const { Schema, model } = require("mongoose");

const auditLogSchema = new Schema(
  {
    collectionName: {
      type: String,
      required: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changedFields: {
      type: [String],
      default: [],
    },
    operation: {
      type: String,
      enum: ["create", "update", "delete", "purge"],
      required: true,
    },
    previousValues: {
      type: Object,
      default: {},
    },
    newValues: {
      type: Object,
      default: {},
    },
  },
  { collection: "auditLogs", timestamps: true }
);

module.exports = model("AuditLog", auditLogSchema);
