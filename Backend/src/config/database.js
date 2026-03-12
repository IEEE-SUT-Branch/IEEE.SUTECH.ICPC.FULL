const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("./logger");
const env = require("./env");

let adminSeeded = false;
let connecting = false; // Mutex — prevents concurrent mongoose.connect() calls
let retryTimer = null;
let retryCount = 0;

const RETRY_DELAYS = [5000, 10000, 20000, 30000, 60000]; // ms

const connectDB = async () => {
  // Already fully connected
  if (mongoose.connection.readyState === 1) return;

  // Another connect() is already in progress — skip duplicate call
  if (connecting) return;

  connecting = true;

  try {
    await mongoose.connect(env.mongo.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    retryCount = 0;
    clearTimeout(retryTimer);
    retryTimer = null;

    const host = mongoose.connection.host || "Atlas";
    logger.info(`MongoDB connected: ${host}`);

    // Seed admin in background — never blocks or throws into connectDB
    setImmediate(() => seedAdmin().catch(() => {}));
  } catch (error) {
    const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
    retryCount++;
    logger.error("MongoDB connection failed:", error.message || error);
    logger.info(
      `Retrying MongoDB connection in ${delay / 1000}s (attempt ${retryCount})...`
    );
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      connectDB().catch(() => {});
    }, delay);
    throw error;
  } finally {
    connecting = false;
  }
};

async function seedAdmin() {
  if (adminSeeded) return;

  try {
    const Admin = require("../models/Admin");
    const count = await Admin.countDocuments();
    if (count === 0) {
      const hash = await bcrypt.hash(env.initialAdmin.password, 12);
      await Admin.create({
        username: env.initialAdmin.username,
        passwordHash: hash,
        fullName: "System Admin",
        role: "admin",
      });
      logger.info(
        `Default admin created (username: ${env.initialAdmin.username})`
      );
    }
    adminSeeded = true;
  } catch (err) {
    if (err.code === 11000) {
      // Already exists — not an error
      adminSeeded = true;
    } else {
      logger.error("Admin seed error:", err.message || err);
    }
  }
}

module.exports = connectDB;
