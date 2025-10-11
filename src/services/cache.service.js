"use strict";

const redisManager = require("../configs/redis");

class CacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = parseInt(process.env.REDIS_TTL) || 3600;
    this.prefix = "landing:";
  }

  async init() {
    try {
      this.client = await redisManager.connect();
      console.log("✅ Cache Service: Initialized");
    } catch (error) {
      console.error("❌ Cache Service: Failed to initialize", error.message);
      // Fallback mode - cache operations will be no-op
      this.client = null;
    }
  }

  async get(key) {
    if (!this.client || !redisManager.isConnected) {
      return null;
    }

    try {
      const cached = await this.client.get(this.prefix + key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return JSON.parse(cached);
      }
      console.log(`🟡 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error("❌ Cache get error:", error.message);
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    if (!this.client || !redisManager.isConnected) {
      return false;
    }

    try {
      await this.client.setEx(this.prefix + key, ttl, JSON.stringify(data));
      console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error("❌ Cache set error:", error.message);
      return false;
    }
  }

  async delete(key) {
    if (!this.client || !redisManager.isConnected) {
      return false;
    }

    try {
      const result = await this.client.del(this.prefix + key);
      console.log(`✅ Cache DELETE: ${key}`);
      return result > 0;
    } catch (error) {
      console.error("❌ Cache delete error:", error.message);
      return false;
    }
  }

  async deletePattern(pattern) {
    if (!this.client || !redisManager.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(this.prefix + pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `✅ Cache DELETE PATTERN: ${pattern} (${keys.length} keys)`
        );
      }
      return true;
    } catch (error) {
      console.error("❌ Cache delete pattern error:", error.message);
      return false;
    }
  }

  async flushAll() {
    if (!this.client || !redisManager.isConnected) {
      return false;
    }

    try {
      await this.client.flushAll();
      console.log("✅ Cache FLUSH: All keys cleared");
      return true;
    } catch (error) {
      console.error("❌ Cache flush error:", error.message);
      return false;
    }
  }

  // Cache key generators
  generateKeys = {
    project: (id) => `project:${id}`,
    projectList: (filters = "") =>
      `projects:list:${Buffer.from(JSON.stringify(filters)).toString(
        "base64"
      )}`,
    sectionTemplates: () => "section:templates:all",
    user: (id) => `user:${id}`,
    health: () => "system:health",
  };

  async healthCheck() {
    if (!this.client || !redisManager.isConnected) {
      return { status: "disconnected", message: "Redis not connected" };
    }

    try {
      await this.client.ping();
      return { status: "connected", message: "Redis is healthy" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }
}

module.exports = new CacheService();
