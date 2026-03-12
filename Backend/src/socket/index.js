const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const logger = require("../config/logger");
const AntiCheatLog = require("../models/AntiCheatLog");
const CodeSave = require("../models/CodeSave");
const Contest = require("../models/Contest");

let io = null;
const onlineStudents = new Map();

function initSocket(server) {
  const socketOrigins =
    env.corsOrigin === "*"
      ? "*"
      : env.corsOrigin.split(",").map((origin) => origin.trim());

  io = new Server(server, {
    cors: {
      origin: socketOrigins,
      credentials: true,
    },
    pingInterval: 15000,
    pingTimeout: 10000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    try {
      socket.user = jwt.verify(token, env.jwt.accessSecret);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    logger.info(
      `Socket connected: ${user.fullName || user.username} (${user.role})`
    );

    if (user.role === "student") {
      socket.join("students");
      socket.join(`student:${user.id}`);

      onlineStudents.set(user.id, {
        socketId: socket.id,
        lastHeartbeat: Date.now(),
        fullName: user.fullName,
        lab: user.lab,
        group: user.group,
        flagged: false,
      });

      io.to("admins").emit("student:connected", {
        studentId: user.id,
        fullName: user.fullName,
        lab: user.lab,
      });
    }

    if (["admin", "judge", "organizer"].includes(user.role)) {
      socket.join("admins");
    }

    // ── Student events ──

    socket.on("student:heartbeat", () => {
      const entry = onlineStudents.get(user.id);
      if (entry) entry.lastHeartbeat = Date.now();
    });

    socket.on("student:anticheat", async (data) => {
      try {
        const contest = await Contest.findOne({ status: "running" }).lean();

        const log = await AntiCheatLog.create({
          studentId: user.id,
          contestId: contest?._id,
          eventType: data.eventType,
          details: data.details || "",
        });

        const entry = onlineStudents.get(user.id);
        if (entry) entry.flagged = true;

        io.to("admins").emit("anticheat:alert", {
          _id: log._id,
          studentId: user.id,
          studentName: user.fullName,
          lab: user.lab,
          eventType: data.eventType,
          details: data.details,
          timestamp: new Date(),
        });
      } catch (err) {
        logger.error("Anticheat event error:", err.message);
      }
    });

    socket.on("code:save", async (data) => {
      try {
        const contest = await Contest.findOne({
          status: { $in: ["running", "paused"] },
        }).lean();
        if (!contest) return;

        await CodeSave.findOneAndUpdate(
          {
            studentId: user.id,
            problemId: data.problemId,
            contestId: contest._id,
          },
          {
            code: data.code || "",
            language: data.language || "cpp",
            cursorPosition: data.cursorPosition || { line: 0, column: 0 },
            savedAt: new Date(),
          },
          { upsert: true }
        );
      } catch (err) {
        logger.error("Code save error:", err.message);
      }
    });

    // ── Admin events ──

    socket.on("admin:warn", (data) => {
      io.to(`student:${data.studentId}`).emit("admin:warning", {
        message: data.message || "Warning from judge",
      });
    });

    socket.on("admin:broadcast", (data) => {
      io.to("students").emit("admin:warning", {
        message: data.message || "Announcement from admin",
      });
    });

    // ── Disconnect ──

    socket.on("disconnect", () => {
      if (user.role === "student") {
        onlineStudents.delete(user.id);
        io.to("admins").emit("student:disconnected", {
          studentId: user.id,
          fullName: user.fullName,
          lab: user.lab,
        });
      }
      logger.info(`Socket disconnected: ${user.fullName || user.username}`);
    });
  });

  // Idle checker
  setInterval(() => {
    for (const [studentId, data] of onlineStudents) {
      if (Date.now() - data.lastHeartbeat > 30000) {
        io.to("admins").emit("student:idle", {
          studentId,
          fullName: data.fullName,
          lab: data.lab,
          lastHeartbeat: data.lastHeartbeat,
        });
      }
    }
  }, 15000);

  logger.info("Socket.io initialized");
}

function getIO() {
  return io;
}

function getOnlineStudents() {
  return onlineStudents;
}

module.exports = { initSocket, getIO, getOnlineStudents };
