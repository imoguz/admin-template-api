"use strict";

const Project = require("../models/project.model");

// Slug validation
const validateSlug = (slug) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

// Response sanitization
const sanitizeProject = (project) => {
  if (!project) return null;

  return {
    _id: project._id,
    title: project.title,
    slug: project.slug,
    description: project.description,
    thumbnail: project.thumbnail,
    sections: project.sections
      .filter((section) => section.isActive)
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        title: section.title,
        order: section.order,
        template: section.template
          ? {
              _id: section.template._id,
              name: section.template.name,
              description: section.template.description,
              icon: section.template.icon,
            }
          : null,
        data: section.data || {},
      })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
};

module.exports = {
  getPublishedProjectBySlug: async (req, res) => {
    try {
      const { slug } = req.params;

      // Slug validation
      if (!validateSlug(slug)) {
        return res.status(400).json({
          success: false,
          error: "Invalid slug format.",
        });
      }

      // Only  published and active project
      const project = await Project.findOne({
        slug: slug.toLowerCase(),
        isPublished: true,
      }).populate("sections.template", "name description icon");

      if (!project) {
        return res.status(404).json({
          success: false,
          error: "Project not found or not published",
        });
      }

      // Sanitized response
      const sanitizedProject = sanitizeProject(project);

      res.json({
        success: true,
        data: sanitizedProject,
      });
    } catch (err) {
      console.error("Public project fetch error:", err);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  },

  getAllPublishedProjects: async (req, res) => {
    try {
      const projects = await Project.find({
        isPublished: true,
      })
        .populate("sections.template", "name description icon")
        .select("title slug description thumbnail sections createdAt updatedAt")
        .sort({ updatedAt: -1 })
        .lean();

      // Sanitized response
      const sanitizedProjects = projects
        .map((project) => sanitizeProject(project))
        .filter((project) => project !== null);

      res.json({
        success: true,
        data: sanitizedProjects,
      });
    } catch (err) {
      console.error("Public projects fetch error:", err);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  },
};
