// server.js
const http = require("http");
const app = require("./src/app");
const env = require("./src/config/env");
const logger = require("./src/config/logger");
const connectDB = require("./src/config/database");
const { verifyConnection } = require("./src/config/mailer");
const { initSocket } = require("./src/socket");

const start = async () => {
  // ═══ Start HTTP server immediately — DB connects in background ═══
  const server = http.createServer(app);
  initSocket(server);

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `Port ${env.port} is already in use. Run: npx kill-port ${env.port}`
      );
    } else {
      logger.error("Server error:", err.message);
    }
    process.exit(1);
  });

  server.listen(env.port, () => {
    logger.info(`Server running at http://localhost:${env.port}`);
    logger.info(
      `Upload CSV:    POST http://localhost:${env.port}/api/students/upload-csv`
    );
    logger.info(
      `Send emails:   POST http://localhost:${env.port}/api/emails/send-all`
    );
    logger.info(
      `Check status:  GET  http://localhost:${env.port}/api/emails/status`
    );
    logger.info(`Contest API:   http://localhost:${env.port}/api/contests`);
    logger.info(`Socket.io:     ws://localhost:${env.port}`);
  });

  // ═══ Connect to MongoDB with retry — does NOT block server startup ═══
  connectDB().catch((err) => {
    logger.warn(
      "Initial MongoDB connection failed — will retry on each request"
    );
  });

  // ═══ Verify SMTP — warn only, do not crash ═══
  const smtpReady = await verifyConnection().catch(() => false);
  if (!smtpReady) {
    logger.warn("SMTP not ready — emails will fail until fixed");
  }
};

start().catch((err) => {
  logger.error("Fatal startup error:", err.message || err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
});
