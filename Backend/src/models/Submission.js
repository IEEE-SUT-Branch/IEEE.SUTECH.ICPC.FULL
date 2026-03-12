const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    code: { type: String, required: true },
    language: {
      type: String,
      enum: ["cpp", "python", "java"],
      required: true,
    },
    verdict: {
      type: String,
      enum: ["queued", "judging", "AC", "WA", "TLE", "MLE", "CE", "RE"],
      default: "queued",
    },
    judgeBackend: {
      type: String,
      enum: ["local", "piston", "wandbox", "jdoodle"],
      default: null,
    },
    executionTimeMs: { type: Number, default: null },
    memoryUsedKB: { type: Number, default: null },
    submittedAt: { type: Date, default: Date.now },
    judgedAt: { type: Date, default: null },
    testCaseResults: [
      {
        testCaseIndex: Number,
        passed: Boolean,
        verdict: String,
        backend: String,
        executionTimeMs: Number,
        memoryUsedKB: Number,
        stderr: String,
        expectedOutputPreview: String,
        actualOutputPreview: String,
      },
    ],
    isAccepted: { type: Boolean, default: false },
    elapsedMinutesFromStart: { type: Number, default: 0 },
  },
  { timestamps: true }
);

submissionSchema.index({ contestId: 1, studentId: 1 });
submissionSchema.index({ contestId: 1, problemId: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
