const mongoose = require("mongoose");
const Project = require("../models/project.model");
const { createAuditLog } = require("../helpers/audit.helper");
const {
  uploadToCloudinaryBuffer,
  deleteFromCloudinary,
} = require("../helpers/cloudinary");

// Slug validation function
const validateSlug = (slug) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

module.exports = {
  createProject: async (req, res) => {
    try {
      // Input sanitization
      const { title, slug, description } = req.body;

      // Ek slug validation
      if (!validateSlug(slug)) {
        return res.status(400).json({
          error:
            "Invalid slug format. Use only lowercase letters, numbers, and hyphens.",
        });
      }

      // Slug uniqueness check
      const existingProject = await Project.findOne({
        slug: sanitize.html(slug),
      });
      if (existingProject) {
        return res.status(409).json({
          error: "A project with this slug already exists.",
        });
      }

      let thumbnail = null;
      if (req.file) {
        // File type validation
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            error: "Only JPEG, JPG, and PNG images are allowed.",
          });
        }

        const result = await uploadToCloudinaryBuffer(
          req.file.buffer,
          sanitize.html(req.file.originalname)
        );
        thumbnail = {
          url: result.secure_url,
          publicId: result.public_id,
        };
      }

      const project = await Project.create({
        title: sanitize.html(title).trim(),
        slug: sanitize.html(slug).toLowerCase().trim(),
        description: description ? sanitize.html(description).trim() : "",
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
      const projects = await Project.find().sort({ updatedAt: -1 });
      res.json({ data: projects });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  getProject: async (req, res) => {
    try {
      const p = await Project.findById(req.params.id);
      if (!p) return res.status(404).json({ error: "Project not found" });
      res.json({ data: p });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  updateProject: async (req, res) => {
    try {
      const updates = req.body;
      const p = await Project.findByIdAndUpdate(req.params.id, updates, {
        new: true,
      });
      if (!p) return res.status(404).json({ error: "Project not found" });
      res.json({ data: p });
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

      if (project.thumbnail?.publicId) {
        await deleteFromCloudinary(project.thumbnail.publicId);
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
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const sectionId = new mongoose.Types.ObjectId();
      const order = project.sections.length;
      const section = { _id: sectionId, template, title, data, order };

      project.sections.push(section);
      await project.save();
      res.status(201).json({ data: section });
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

      // Data handling - daha esnek hale getir
      if (data === undefined || data === null) {
        data = {}; // undefined veya null ise boş object yap
      }

      // String ise JSON parse etmeye çalış
      if (typeof data === "string") {
        try {
          if (data.trim() === "") {
            data = {}; // Boş string ise boş object
          } else {
            data = JSON.parse(data);
          }
        } catch (parseError) {
          console.warn("JSON parse failed, using string as data:", data);
          // Parse edilemezse string olarak bırak
        }
      }

      // Data artık her türlü olabilir (object, array, string, number, boolean)
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const section = project.sections.id(sectionId);
      if (!section) return res.status(404).json({ error: "Section not found" });

      const files = req.files || [];

      // Eğer data object ise ve cards array'i varsa image processing yap
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        data.cards &&
        Array.isArray(data.cards)
      ) {
        // Validate cards array size
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
              const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
              if (!allowedMimeTypes.includes(file.mimetype)) {
                throw new Error(
                  `Invalid file type for card ${idx}. Only images allowed.`
                );
              }

              const result = await uploadToCloudinaryBuffer(
                file.buffer,
                file.originalname
              );
              return {
                ...card,
                image: {
                  url: result.secure_url,
                  publicId: result.public_id,
                },
              };
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

      // Update section
      if (title !== undefined) section.title = title.trim();
      if (isActive !== undefined) section.isActive = Boolean(isActive);
      if (data !== undefined) {
        // Size validation (sadece stringify edilebilir veriler için)
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
      res.json({ data: section });
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

      // reindex order
      project.sections = project.sections.map((s, idx) => {
        s.order = idx;
        return s;
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
      if (!Array.isArray(order))
        return res.status(400).json({ error: "order must be an array" });

      const project = await Project.findById(id);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const map = {};
      project.sections.forEach((s) => {
        map[s._id.toString()] = s.toObject();
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
      res.json({ data: project.sections });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
};
