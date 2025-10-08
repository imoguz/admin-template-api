const mongoose = require("mongoose");
const { Schema } = mongoose;

const SectionSchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      auto: true,
    },

    template: {
      type: String,
      required: true,
      enum: [
        "header",
        "hero",
        "contact-form",
        "services",
        "testimonials",
        "video-showcase",
        "featured-product",
        "statistics",
        "top-choice",
        "cta-banner",
        "how-it-works",
        "best-choice",
        "highlights",
        "faq",
        "footer",
      ],
    },

    title: {
      type: String,
      trim: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    data: {
      type: Schema.Types.Mixed,
      default: {},
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const ThumbnailSchema = new Schema(
  {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    thumbnail: {
      type: ThumbnailSchema,
      default: null,
    },

    sections: [SectionSchema],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);
