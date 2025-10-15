"use strict";

const PERMISSIONS = {
  // User
  CREATE_USER: [],
  VIEW_USER: ["admin", "staff"],
  UPDATE_USER: ["admin", "staff"],
  DELETE_USER: ["admin", "staff"],
  LIST_USERS: ["admin"],

  // Project
  CREATE_PROJECT: ["admin"],
  VIEW_PROJECT: ["admin", "staff"],
  UPDATE_PROJECT: ["admin"],
  DELETE_PROJECT: ["admin"],
  LIST_PROJECTS: ["admin", "staff"],

  // Manage Section Template
  MANAGE_TEMPLATES: ["admin"],
};

module.exports = PERMISSIONS;
