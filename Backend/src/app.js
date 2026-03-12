const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./config/database");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const env = require("./config/env");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: env.corsOrigin === "*" ? "*" : env.corsOrigin.split(",").map((o) => o.trim()),
  credentials: true,
}));
app.use(express.json());

// ═══ Serve static files (logo, assets) ═══
app.use(express.static(path.join(__dirname, "../public")));

// ═══ Health check — bypasses DB middleware ═══
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    success: true,
    message: "IEEE SUTECH Platform is running",
    db: dbStatus[dbState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

// ═══ Connect DB on every request (cached — only connects once) ═══
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      success: false,
      message: "Database unavailable — retrying in background",
    });
  }
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;
