"use strict";

const SectionTemplate = require("../models/sectionTemplate.model");
const { createAuditLog } = require("../helpers/audit.helper");
const cacheService = require("../services/cache.service");

// Cache keys
const CACHE_KEYS = {
  ALL_TEMPLATES: "section:templates:all",
  TEMPLATE_DETAIL: (id) => `section:template:${id}`,
};

module.exports = {
  listTemplates: async (req, res) => {
    try {
      // try retrive from cache
      const cacheKey = CACHE_KEYS.ALL_TEMPLATES;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: cached,
          count: cached.length,
          source: "cache",
        });
      }

      // if not in cache fetch database
      const templates = await SectionTemplate.find({ isActive: true })
        .sort({ name: 1 })
        .select("name description icon slug")
        .lean();

      // Save cache (5m)
      await cacheService.set(cacheKey, templates, 300);

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

      // Retrive from cache
      const cacheKey = CACHE_KEYS.TEMPLATE_DETAIL(id);
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: cached,
          source: "cache",
        });
      }

      const template = await SectionTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          error: true,
          message: "Section template not found",
        });
      }

      // Save cache (10m)
      await cacheService.set(cacheKey, template, 600);

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

      // Clean cache
      await cacheService.deletePattern("section:templates:*");

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

      // clean cache
      await cacheService.deletePattern("section:templates:*");

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

      // Clean cache
      await cacheService.deletePattern("section:templates:*");

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
