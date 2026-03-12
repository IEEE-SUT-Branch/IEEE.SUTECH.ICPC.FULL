const mongoose = require("mongoose");

const contestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["not_started", "running", "paused", "ended"],
      default: "not_started",
    },
    durationMinutes: { type: Number, default: 60 },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    totalPausedMs: { type: Number, default: 0 },
    endedAt: { type: Date, default: null },
    allowedLanguages: {
      type: [String],
      default: ["cpp", "python", "java"],
    },
    type: {
      type: String,
      enum: ["placement", "final"],
      default: "placement",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contest", contestSchema);
