"use strict";

const redis = require("redis");

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = parseInt(process.env.REDIS_TTL) || 3600;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.fallbackMode = false;

    this.init();
  }

  async init() {
    // Development modunda ve Redis yoksa fallback mode
    if (process.env.NODE_ENV === "development") {
      const fallbackCheck = await this.checkRedisAvailability();
      if (!fallbackCheck.available) {
        console.log(
          "💡 Development: Redis not available, enabling fallback mode"
        );
        this.fallbackMode = true;
        return;
      }
    }

    await this.connectToRedis();
  }

  async checkRedisAvailability() {
    return new Promise((resolve) => {
      const testClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 3000,
          lazyConnect: false,
        },
      });

      const timeout = setTimeout(() => {
        testClient.quit().catch(() => {});
        resolve({ available: false, error: "Timeout" });
      }, 5000);

      testClient.on("ready", () => {
        clearTimeout(timeout);
        testClient.quit().catch(() => {});
        resolve({ available: true });
      });

      testClient.on("error", () => {
        clearTimeout(timeout);
        testClient.quit().catch(() => {});
        resolve({ available: false, error: "Connection failed" });
      });

      testClient.connect().catch(() => {});
    });
  }

  async connectToRedis() {
    try {
      console.log("🟡 Redis: Initializing connection...");

      const redisOptions = {
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 10000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            this.retryCount = retries;
            if (retries > this.maxRetries) {
              console.log("🔴 Redis: Too many retries, enabling fallback mode");
              this.fallbackMode = true;
              return false; // Retry'i durdur
            }
            console.log(
              `🟡 Redis: Retrying connection (${retries}/${this.maxRetries})`
            );
            return Math.min(retries * 100, 3000);
          },
        },
      };

      this.client = redis.createClient(redisOptions);

      // Event handlers
      this.client.on("connect", () => {
        console.log("🟡 Redis: Connecting...");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
        this.fallbackMode = false;
        this.retryCount = 0;
        console.log("✅ Redis: Connected and ready");
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        if (!this.fallbackMode) {
          console.log("❌ Redis error:", err.message);
        }
      });

      this.client.on("end", () => {
        this.isConnected = false;
        if (!this.fallbackMode) {
          console.log("🔴 Redis: Connection closed");
        }
      });

      this.client.on("reconnecting", () => {
        if (!this.fallbackMode) {
          console.log("🟡 Redis: Reconnecting...");
        }
      });

      await this.client.connect();

      if (this.isConnected) {
        console.log("✅ Redis: Connection established successfully");
      }
    } catch (error) {
      console.error("❌ Failed to initialize Redis:", error.message);
      this.isConnected = false;
      this.fallbackMode = true;

      if (process.env.NODE_ENV === "development") {
        console.log(
          "💡 Development: Running in fallback mode (cache disabled)"
        );
        console.log("💡 To enable Redis, run: docker-compose up -d redis");
      }
    }
  }

  async set(key, data, ttl = null) {
    if (this.fallbackMode || !this.isConnected) {
      return false; // Fallback mode'da cache işlemi yapma
    }

    try {
      const ttlValue = ttl || this.defaultTTL;
      await this.client.setEx(key, ttlValue, JSON.stringify(data));
      console.log(`✅ Cache SET: ${key} (TTL: ${ttlValue}s)`);
      return true;
    } catch (err) {
      console.error("❌ Cache set error:", err.message);
      return false;
    }
  }

  async get(key) {
    if (this.fallbackMode || !this.isConnected) {
      return null; // Fallback mode'da cache'ten okuma yapma
    }

    try {
      const cached = await this.client.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return JSON.parse(cached);
      } else {
        console.log(`🟡 Cache MISS: ${key}`);
        return null;
      }
    } catch (err) {
      console.error("❌ Cache get error:", err.message);
      return null;
    }
  }

  async delete(key) {
    if (this.fallbackMode || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      console.log(`✅ Cache DELETE: ${key} (${result} keys removed)`);
      return result > 0;
    } catch (err) {
      console.error("❌ Cache delete error:", err.message);
      return false;
    }
  }

  async deletePattern(pattern) {
    if (this.fallbackMode || !this.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `✅ Cache DELETE PATTERN: ${pattern} (${keys.length} keys removed)`
        );
      }
      return true;
    } catch (err) {
      console.error("❌ Cache delete pattern error:", err.message);
      return false;
    }
  }

  async healthCheck() {
    if (this.fallbackMode) {
      return {
        status: "fallback",
        message: "Running in fallback mode (cache disabled)",
      };
    }

    if (!this.isConnected) {
      return { status: "disconnected", message: "Redis not connected" };
    }

    try {
      await this.client.ping();
      return { status: "connected", message: "Redis is healthy" };
    } catch (err) {
      return { status: "error", message: err.message };
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      fallbackMode: this.fallbackMode,
      retryCount: this.retryCount,
    };
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log("🔴 Redis: Disconnected");
    }
  }
}

module.exports = new CacheManager();
