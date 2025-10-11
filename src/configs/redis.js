"use strict";

const redis = require("redis");

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = parseInt(process.env.REDIS_TTL) || 3600;
  }

  async connect() {
    try {
      const redisOptions = {
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 10000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log("🔴 Redis: Too many retries");
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
        password: process.env.REDIS_PASSWORD || undefined,
      };

      this.client = redis.createClient(redisOptions);

      this.client.on("connect", () => {
        console.log("🟡 Redis: Connecting...");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
        console.log("✅ Redis: Connected and ready");
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        console.log("❌ Redis error:", err.message);
      });

      this.client.on("end", () => {
        this.isConnected = false;
        console.log("🔴 Redis: Connection closed");
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  getClient() {
    return this.client;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      url: process.env.REDIS_URL
        ? process.env.REDIS_URL.replace(/:[^:]*?@/, ":****@")
        : "not configured",
    };
  }
}

module.exports = new RedisManager();
