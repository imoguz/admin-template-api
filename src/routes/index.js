"use strict";

const router = require("express").Router();
const { authLimiter, strictLimiter } = require("../middlewares/rateLimiter");

router.use("/health", require("./health.route"));

router.use("/auth", authLimiter, require("./auth.route"));

router.use("/users", require("./user.route"));
router.use("/projects", require("./project.route"));
router.use("/test", require("./test.route"));
module.exports = router;
