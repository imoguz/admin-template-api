"use strict";

const SectionTemplate = require("../models/sectionTemplate.model");
const { createAuditLog } = require("../helpers/audit.helper");

module.exports = {
  listTemplates: async (req, res) => {
    try {
      // Direct database fetch (cache removed)
      const templates = await SectionTemplate.find({ isActive: true })
        .sort({ name: 1 })
        .select("name description icon slug")
        .lean();

      res.json({
        success: true,
        data: templates,
        count: templates.length,
        source: "database",
      });
    } catch (err) {
      console.error("List templates error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to fetch section templates",
      });
    }
  },

  getTemplate: async (req, res) => {
    try {
      const { id } = req.params;

      const template = await SectionTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          error: true,
          message: "Section template not found",
        });
      }

      res.json({
        success: true,
        data: template,
        source: "database",
      });
    } catch (err) {
      console.error("Get template error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to fetch section template",
      });
    }
  },

  createTemplate: async (req, res) => {
    try {
      const { name, slug, description = "", icon = "" } = req.body;

      // Name and slug uniqueness check
      const existingTemplate = await SectionTemplate.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, "i") } },
          { slug: { $regex: new RegExp(`^${slug}$`, "i") } },
        ],
      });

      if (existingTemplate) {
        return res.status(409).json({
          error: true,
          message: "A template with this name or slug already exists",
        });
      }

      const template = await SectionTemplate.create({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        icon: icon.trim(),
      });

      // Audit log
      await createAuditLog({
        collectionName: "sectionTemplates",
        documentId: template._id,
        changedBy: req.user?.id,
        changedFields: ["name", "slug", "description", "icon"],
        operation: "create",
        previousValues: {},
        newValues: template.toObject(),
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (err) {
      console.error("Create template error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to create section template",
      });
    }
  },

  updateTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const template = await SectionTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          error: true,
          message: "Section template not found",
        });
      }

      // Name uniqueness check
      if (updates.name || updates.slug) {
        const existingTemplate = await SectionTemplate.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${updates.name}$`, "i") } },
            { slug: { $regex: new RegExp(`^${updates.slug}$`, "i") } },
          ],
          _id: { $ne: id },
        });

        if (existingTemplate) {
          return res.status(409).json({
            error: true,
            message: "A template with this name or slug already exists",
          });
        }
      }

      const previousValues = template.toObject();

      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          template[key] = updates[key];
        }
      });

      await template.save();

      // Audit log
      await createAuditLog({
        collectionName: "sectionTemplates",
        documentId: template._id,
        changedBy: req.user?.id,
        changedFields: Object.keys(updates),
        operation: "update",
        previousValues,
        newValues: template.toObject(),
      });

      res.json({
        success: true,
        data: template,
      });
    } catch (err) {
      console.error("Update template error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to update section template",
      });
    }
  },

  deleteTemplate: async (req, res) => {
    try {
      const { id } = req.params;

      const template = await SectionTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          error: true,
          message: "Section template not found",
        });
      }

      // Check if any project is using this template
      const Project = require("../models/project.model");
      const projectsUsingTemplate = await Project.countDocuments({
        "sections.template": id,
      });

      if (projectsUsingTemplate > 0) {
        return res.status(400).json({
          error: true,
          message: `Cannot delete template. It is being used by ${projectsUsingTemplate} project(s).`,
        });
      }

      const previousValues = template.toObject();
      template.isActive = false;
      await template.save();

      // Audit log
      await createAuditLog({
        collectionName: "sectionTemplates",
        documentId: template._id,
        changedBy: req.user?.id,
        changedFields: ["isActive"],
        operation: "delete",
        previousValues,
        newValues: template.toObject(),
      });

      res.json({
        success: true,
        message: "Section template deleted successfully",
      });
    } catch (err) {
      console.error("Delete template error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to delete section template",
      });
    }
  },
};
