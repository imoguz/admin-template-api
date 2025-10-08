"use strict";

const User = require("../models/user.model");
const { createAuditLog } = require("../helpers/audit.helper");

module.exports = {
  create: async (req, res) => {
    const { firstname, lastname, email, password, profileUrl } = req.body;

    const newUser = await User.create({
      firstname,
      lastname,
      email,
      password,
      profileUrl: profileUrl || null,
    });

    // Audit log
    await createAuditLog({
      collectionName: "users",
      documentId: newUser._id,
      changedBy: req.user?.id || newUser._id,
      changedFields: ["firstname", "lastname", "email", "profileUrl"],
      operation: "create",
      previousValues: {},
      newValues: newUser.toObject(),
    });

    res.status(201).send(newUser);
  },

  readOne: async (req, res) => {
    if (req.params.id !== req.user?.id && req.user?.role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const data = await User.findById(req.params.id);
    res.status(200).send(data);
  },

  readMany: async (req, res, next) => {
    try {
      const baseFilter =
        req.user?.role === "admin" ? {} : { _id: req.user?.id };

      const data = await req.queryHandler(
        User,
        null,
        ["firstname", "lastname", "email", "role", "position"], // searchable fields
        baseFilter
      );

      res.send(data);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res) => {
    if (req.params.id !== req.user?.id && req.user?.role !== "admin") {
      return res.status(401).send("You are not authorized to update.");
    }

    if (req.user?.role !== "admin") {
      delete req.body.role;
      delete req.body.position;
    }

    const userData = await User.findById(req.params.id);

    if (!userData) return res.status(404).send("User not found");

    const changedFields = Object.keys(req.body).filter(
      (key) => userData[key] !== req.body[key]
    );
    const previousValues = {};
    const newValues = {};

    changedFields.forEach((field) => {
      previousValues[field] = userData[field];
      newValues[field] = req.body[field];
    });

    if (changedFields.length === 0) {
      return res
        .status(200)
        .json({ message: "No valid changes provided for update." });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Audit log
    await createAuditLog({
      collectionName: "users",
      documentId: updatedUser._id,
      changedBy: req.user.id,
      changedFields,
      operation: "update",
      previousValues,
      newValues,
    });

    res.status(202).json(updatedUser);
  },

  _delete: async (req, res, next) => {
    try {
      const user = await User.findOne({
        _id: req.params.id,
        isDeleted: false,
      });

      if (!user) return res.status(404).send("User not found.");

      const isAuthorized =
        req.user.role === "admin" || req.params.id === req.user?.id;

      if (!isAuthorized)
        return res
          .status(403)
          .send("You are not authorized to delete this user.");

      const previousValues = { isDeleted: user.isDeleted };
      user.isDeleted = true;
      await user.save();

      // Audit log
      await createAuditLog({
        collectionName: "users",
        documentId: user._id,
        changedBy: req.user.id,
        changedFields: ["isDeleted"],
        operation: "delete",
        previousValues,
        newValues: { isDeleted: true },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  purge: async (req, res, next) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).send("Only admins can purge users.");
      }

      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).send("User not found.");

      // Audit log
      await createAuditLog({
        collectionName: "users",
        documentId: user._id,
        changedBy: req.user.id,
        changedFields: [],
        operation: "purge",
        previousValues: user.toObject(),
        newValues: {},
      });

      await User.deleteOne({ _id: req.params.id });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
