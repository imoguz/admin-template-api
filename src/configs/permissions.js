"use strict";

const PERMISSIONS = {
  // User
  CREATE_USER: ["admin", "staff"],
  VIEW_USER: ["admin", "staff"],
  UPDATE_USER: ["admin", "staff"],
  DELETE_USER: ["admin"],
  LIST_USERS: ["admin", "staff"],

  // User
  CREATE_PROJECT: ["admin", "staff"],
  VIEW_PROJECT: ["admin", "staff"],
  UPDATE_PROJECT: ["admin", "staff"],
  DELETE_PROJECT: ["admin"],
  LIST_PROJECTS: ["admin", "staff"],
};

module.exports = PERMISSIONS;
