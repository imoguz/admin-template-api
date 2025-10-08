"use strict";

const PERMISSIONS = require("../configs/permissions");

function requirePermission(permissionKey) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      res.status(401).send("Authentication required.");
      return;
    }

    const allowedRoles = PERMISSIONS[permissionKey];
    if (!allowedRoles) {
      console.warn(`Unknown permission key: ${permissionKey}`);
      return res.status(500).send("Permission configuration error.");
    }

    if (!allowedRoles.includes(user.role)) {
      return res
        .status(403)
        .send("You do not have permission to perform this action.");
    }

    next();
  };
}

module.exports = requirePermission;
