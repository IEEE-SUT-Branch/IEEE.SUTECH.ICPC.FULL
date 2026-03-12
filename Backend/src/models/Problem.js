const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: "" },
  expectedOutput: { type: String, default: "" },
  isVisible: { type: Boolean, default: false },
});

const checkerSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["token", "line", "exact"],
      default: "token",
    },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    letter: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    inputDescription: { type: String, default: "" },
    outputDescription: { type: String, default: "" },
    notes: { type: String, default: "" },
    timeLimitSeconds: { type: Number, default: 1 },
    memoryLimitMB: { type: Number, default: 256 },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    checker: { type: checkerSchema, default: () => ({ mode: "token" }) },
    testCases: [testCaseSchema],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

problemSchema.index({ contestId: 1, letter: 1 }, { unique: true });

module.exports = mongoose.model("Problem", problemSchema);
