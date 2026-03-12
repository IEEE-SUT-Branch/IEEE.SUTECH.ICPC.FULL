const mongoose = require("mongoose");

const antiCheatLogSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      default: null,
    },
    eventType: {
      type: String,
      enum: [
        "tab_switch",
        "window_blur",
        "fullscreen_exit",
        "paste_attempt",
        "copy_attempt",
        "idle_timeout",
        "warning_sent",
        "penalty_added",
        "disqualified",
      ],
      required: true,
    },
    details: { type: String, default: "" },
    acknowledged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

antiCheatLogSchema.index({ studentId: 1 });
antiCheatLogSchema.index({ contestId: 1 });

module.exports = mongoose.model("AntiCheatLog", antiCheatLogSchema);
