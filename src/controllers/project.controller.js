"use strict";

const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");
const Project = require("../models/project.model");
const { createAuditLog } = require("../helpers/audit.helper");
const SectionTemplate = require("../models/sectionTemplate.model");
const fileStorage = require("../helpers/fileStorage");

// Slug validation function
const validateSlug = (slug) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

// HTML sanitize configuration
const sanitizeConfig = {
  allowedTags: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https"],
};

// Safe sanitize function
const safeSanitize = (input) => {
  if (typeof input !== "string") return input;
  return sanitizeHtml(input.trim(), sanitizeConfig);
};

module.exports = {
  createProject: async (req, res) => {
    try {
      const { title, slug, description } = req.body;

      // slug validation
      if (!validateSlug(slug)) {
        return res.status(400).json({
          error:
            "Invalid slug format. Use only lowercase letters, numbers, and hyphens.",
        });
      }

      // Slug uniqueness check - sanitize
      const cleanSlug = safeSanitize(slug).toLowerCase();
      const existingProject = await Project.findOne({
        slug: cleanSlug,
      });

      if (existingProject) {
        return res.status(409).json({
          error: "A project with this slug already exists.",
        });
      }

      let thumbnail = null;
      if (req.file) {
        try {
          const fileInfo = await fileStorage.uploadFile(
            req.file.buffer,
            safeSanitize(req.file.originalname),
            req.file.mimetype,
            true // optimize images
          );

          thumbnail = {
            url: fileInfo.url,
            filename: fileInfo.filename,
            originalName: fileInfo.originalName,
            size: fileInfo.size,
          };
        } catch (fileError) {
          return res.status(400).json({
            error: fileError.message,
          });
        }
      }

      const project = await Project.create({
        title: safeSanitize(title),
        slug: cleanSlug,
        description: description ? safeSanitize(description) : "",
        thumbnail,
        createdBy: req.user?._id,
      });

      res.status(201).json(project);
    } catch (err) {
      console.error(err);

      // MongoDB duplicate key error
      if (err.code === 11000) {
        return res.status(409).json({
          error: "A project with this slug already exists.",
        });
      }

      res.status(500).json({ error: "Failed to create project" });
    }
  },

  listProjects: async (req, res) => {
    try {
      const projects = await Project.find()
        .populate("sections.template", "name description icon")
        .sort({ updatedAt: -1 });
      res.json({ data: projects });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  getProject: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id).populate(
        "sections.template",
        "name description icon"
      );

      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json({ data: project });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  getProjectBySlug: async (req, res) => {
    try {
      const { slug } = req.params;

      const project = await Project.findOne({ slug }).populate(
        "sections.template",
        "name description icon"
      );

      if (!project) return res.status(404).json({ error: "Project not found" });

      res.json({ data: project });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  updateProject: async (req, res) => {
    try {
      const { title, slug, description } = req.body;
      const updates = {};

      // Update only provided fields
      if (title !== undefined) updates.title = safeSanitize(title);
      if (slug !== undefined) updates.slug = safeSanitize(slug).toLowerCase();
      if (description !== undefined)
        updates.description = safeSanitize(description);

      const project = await Project.findByIdAndUpdate(req.params.id, updates, {
        new: true,
      }).populate("sections.template", "name description icon");

      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json({ data: project });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  },

  deleteProject: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Delete thumbnail file if exists
      if (project.thumbnail?.filename) {
        await fileStorage.deleteFile(project.thumbnail.filename);
      }

      await project.deleteOne();

      res.json({ message: "Project deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete project" });
    }
  },

  addSection: async (req, res) => {
    try {
      const { template, title = "", data = {} } = req.body;

      const templateExists = await SectionTemplate.findOne({
        _id: template,
        isActive: true,
      });

      if (!templateExists) {
        return res.status(400).json({
          error: "Invalid template or template is not active",
        });
      }

      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const sectionId = new mongoose.Types.ObjectId();
      const order = project.sections.length;
      const section = {
        _id: sectionId,
        template,
        title: safeSanitize(title),
        data,
        order,
      };

      project.sections.push(section);
      await project.save();
      await project.populate("sections.template", "name description icon");

      res.status(201).json({
        data: project.sections.id(sectionId),
      });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  },

  updateSection: async (req, res) => {
    try {
      const { id: projectId, sectionId } = req.params;
      const { title, isActive } = req.body;
      let { data } = req.body;

      // Data handling
      if (data === undefined || data === null) {
        data = {};
      }

      // if string parse JSON
      if (typeof data === "string") {
        try {
          if (data.trim() === "") {
            data = {};
          } else {
            data = JSON.parse(data);
          }
        } catch (parseError) {
          console.warn("JSON parse failed, using string as data:", data);
        }
      }

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const section = project.sections.id(sectionId);
      if (!section) return res.status(404).json({ error: "Section not found" });

      const files = req.files || [];

      // Image processing for cards
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        data.cards &&
        Array.isArray(data.cards)
      ) {
        if (data.cards.length > 50) {
          return res.status(400).json({
            error: "Too many cards. Maximum 50 cards allowed.",
          });
        }

        data.cards = await Promise.all(
          data.cards.map(async (card, idx) => {
            if (!card || typeof card !== "object") {
              return card;
            }

            const fileFieldName = `cards[${idx}][image]`;
            const file = files.find((f) => f.fieldname === fileFieldName);

            if (file) {
              try {
                const fileInfo = await fileStorage.uploadFile(
                  file.buffer,
                  file.originalname,
                  file.mimetype,
                  true
                );

                return {
                  ...card,
                  image: {
                    url: fileInfo.url,
                    filename: fileInfo.filename,
                    originalName: fileInfo.originalName,
                  },
                };
              } catch (fileError) {
                console.warn(
                  `File upload failed for card ${idx}:`,
                  fileError.message
                );
                return {
                  ...card,
                  image: null,
                };
              }
            }

            // Existing image handling
            if (
              card.image &&
              typeof card.image === "string" &&
              card.image.trim() !== ""
            ) {
              try {
                new URL(card.image);
                return {
                  ...card,
                  image: { url: card.image.trim() },
                };
              } catch (urlError) {
                console.warn(`Invalid image URL for card ${idx}:`, card.image);
                return {
                  ...card,
                  image: null,
                };
              }
            }

            if (card.image && typeof card.image === "object") {
              return card;
            }

            return {
              ...card,
              image: null,
            };
          })
        );
      }

      // Update section with sanitization
      if (title !== undefined) section.title = safeSanitize(title);
      if (isActive !== undefined) section.isActive = Boolean(isActive);
      if (data !== undefined) {
        try {
          if (JSON.stringify(data).length > 100000) {
            return res.status(400).json({
              error: "Section data too large. Maximum 100KB allowed.",
            });
          }
        } catch (stringifyError) {
          console.warn("Data cannot be stringified for size check:", data);
        }
        section.data = data;
      }

      await project.save();
      await project.populate("sections.template", "name description icon");

      res.json({ data: project.sections.id(sectionId) });
    } catch (err) {
      console.error("Update section error:", err);

      if (err.message.includes("Invalid file type")) {
        return res.status(400).json({ error: err.message });
      }

      res.status(400).json({ error: err.message });
    }
  },

  deleteSection: async (req, res) => {
    try {
      const { id: projectId, sectionId } = req.params;
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const section = project.sections.id(sectionId);
      if (!section) return res.status(404).json({ error: "Section not found" });

      project.sections.pull({ _id: sectionId });

      // Reindex order
      project.sections.forEach((sec, idx) => {
        sec.order = idx;
      });

      await project.save();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  reorderSections: async (req, res) => {
    try {
      const { id } = req.params;
      const { order } = req.body;

      if (!Array.isArray(order)) {
        return res.status(400).json({ error: "order must be an array" });
      }

      const project = await Project.findById(id);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const map = {};
      project.sections.forEach((sec) => {
        map[sec._id.toString()] = sec.toObject();
      });

      const newSections = [];
      order.forEach((sid, idx) => {
        if (map[sid]) {
          const sec = map[sid];
          sec.order = idx;
          newSections.push(sec);
          delete map[sid];
        }
      });

      Object.values(map).forEach((sec) => {
        sec.order = newSections.length;
        newSections.push(sec);
      });

      project.sections = newSections;
      await project.save();
      await project.populate("sections.template", "name description icon");

      res.json({ data: project.sections });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
};
