"use strict";

const router = require("express").Router();
const jwtVerification = require("../middlewares/jwt.verification");
const requirePermission = require("../middlewares/requirePermission");
const validate = require("../middlewares/validation");
const {
  createUserSchema,
  updateUserSchema,
} = require("../validators/user.validator");

const {
  create,
  readOne,
  readMany,
  update,
  _delete,
  purge,
} = require("../controllers/user.controller");

router.post("/", validate(createUserSchema), create);

router.get("/", jwtVerification, requirePermission("LIST_USERS"), readMany);

router
  .route("/:id")
  .get(jwtVerification, requirePermission("VIEW_USER"), readOne)
  .put(
    jwtVerification,
    requirePermission("UPDATE_USER"),
    validate(updateUserSchema),
    update
  )
  .delete(jwtVerification, requirePermission("DELETE_USER"), _delete);

router.delete(
  "/purge/:id",
  jwtVerification,
  requirePermission("PURGE_RECORD"),
  purge
);

module.exports = router;
