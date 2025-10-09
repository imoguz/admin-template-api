"use strict";

const router = require("express").Router();
const jwtVerification = require("../middlewares/jwt.verification");
const requirePermission = require("../middlewares/requirePermission");
const validate = require("../middlewares/validation");

const {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require("../controllers/sectionTemplate.controller");

const {
  createTemplateSchema,
  updateTemplateSchema,
} = require("../validators/sectionTemplate.validator");

// Public - herkes template'leri görebilir
router.get("/", listTemplates);
router.get("/:id", getTemplate);

// Admin only routes
router.post(
  "/",
  jwtVerification,
  requirePermission("MANAGE_TEMPLATES"),
  validate(createTemplateSchema),
  createTemplate
);

router.put(
  "/:id",
  jwtVerification,
  requirePermission("MANAGE_TEMPLATES"),
  validate(updateTemplateSchema),
  updateTemplate
);

router.delete(
  "/:id",
  jwtVerification,
  requirePermission("MANAGE_TEMPLATES"),
  deleteTemplate
);

module.exports = router;
