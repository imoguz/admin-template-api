const mongoose = require("mongoose");
const Project = require("../models/project.model");

async function seed() {
  await mongoose.connect("mongodb://127.0.0.1:27017/template");
  await Project.deleteMany({});

  const p = new Project({
    title: "Landing Beta",
    slug: "landing-beta",
    description: "Sample landing page",
    sections: [
      {
        template: "hero",
        title: "Hero",
        order: 0,
        data: {
          headline: "Welcome to Landing Beta",
          backgroundImage: "/images/hero.jpg",
        },
      },
      {
        template: "grid-card",
        title: "Features Grid",
        order: 1,
        data: {
          cards: [
            {
              id: "c1",
              image: "/images/card1.jpg",
              title: "Fast",
              text: "Load fast",
            },
            {
              id: "c2",
              image: "/images/card2.jpg",
              title: "Secure",
              text: "Secure by design",
            },
          ],
          backgroundColor: "#ffffff",
        },
      },
    ],
  });

  await p.save();
  console.log("Seed done:", p._id.toString());
  process.exit(0);
}

seed().catch((err) => console.error(err));

// node src/seeds/seed.js
