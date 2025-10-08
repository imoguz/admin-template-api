"use strict";

const router = require("express").Router();
const jwtVerification = require("../middlewares/jwt.verification");
const requirePermission = require("../middlewares/requirePermission");
const validate = require("../middlewares/validation");
const {
  createProjectSchema,
  updateProjectSchema,
  addSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
} = require("../validators/project.validator");
const { singleFile, anyFiles } = require("../middlewares/multer");

const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
} = require("../controllers/project.controller");

router.get(
  "/",
  jwtVerification,
  requirePermission("LIST_PROJECTS"),
  listProjects
);

router.post(
  "/",
  jwtVerification,
  requirePermission("CREATE_PROJECT"),
  singleFile("thumbnail"),
  validate(createProjectSchema),
  createProject
);

router.get(
  "/:id",
  jwtVerification,
  requirePermission("VIEW_PROJECT"),
  getProject
);

router.put(
  "/:id",
  jwtVerification,
  requirePermission("UPDATE_PROJECT"),
  validate(updateProjectSchema),
  updateProject
);

router.delete(
  "/:id",
  jwtVerification,
  requirePermission("DELETE_PROJECT"),
  deleteProject
);

// section operations
router.post(
  "/:id/sections",
  jwtVerification,
  requirePermission("CREATE_PROJECT"),
  validate(addSectionSchema),
  addSection
);

router.put(
  "/:id/sections/reorder",
  jwtVerification,
  requirePermission("UPDATE_PROJECT"),
  validate(reorderSectionsSchema),
  reorderSections
);

router.put(
  "/:id/sections/:sectionId",
  jwtVerification,
  requirePermission("UPDATE_PROJECT"),
  anyFiles(),
  validate(updateSectionSchema),
  updateSection
);

router.delete(
  "/:id/sections/:sectionId",
  jwtVerification,
  requirePermission("DELETE_PROJECT"),
  deleteSection
);

module.exports = router;
