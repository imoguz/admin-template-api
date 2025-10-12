#!/usr/bin/env node
"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const mongoose = require("mongoose");

async function checkCollections() {
  try {
    await mongoose.connect(process.env.MONGODB);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log("📊 Database Collections:");
    console.log("========================");

    if (collections.length === 0) {
      console.log("❌ No collections found in database");
      return;
    }

    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`📁 ${collection.name}: ${count} documents`);
    }

    console.log(`\n📈 Total: ${collections.length} collections`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkCollections();
