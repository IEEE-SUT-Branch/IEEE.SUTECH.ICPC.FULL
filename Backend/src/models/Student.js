const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════
    // EMAIL SYSTEM FIELDS (unchanged)
    // ═══════════════════════════════════════
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    universityId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    labAssignment: {
      type: String,
      enum: ["Lab 6", "Lab 7", "Lab 123"],
      required: true,
    },
    testGroup: {
      type: String,
      enum: ["Group1", "Group2"],
      required: true,
    },
    labPassword: {
      type: String,
      default: null,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    emailError: {
      type: String,
      default: null,
    },

    // ═══════════════════════════════════════
    // CONTEST FIELDS (added)
    // ═══════════════════════════════════════
    contestSession: {
      bonusTimeSeconds: { type: Number, default: 0 },
      isDisqualified: { type: Boolean, default: false },
      disqualifiedAt: { type: Date, default: null },
      disqualifiedReason: { type: String, default: null },
      warningCount: { type: Number, default: 0 },
      penaltyMinutesAdded: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
