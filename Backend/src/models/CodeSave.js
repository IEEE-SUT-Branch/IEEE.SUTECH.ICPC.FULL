const mongoose = require("mongoose");

const codeSaveSchema = new mongoose.Schema(
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
    code: { type: String, default: "" },
    language: { type: String, default: "cpp" },
    cursorPosition: {
      line: { type: Number, default: 0 },
      column: { type: Number, default: 0 },
    },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

codeSaveSchema.index(
  { studentId: 1, problemId: 1, contestId: 1 },
  { unique: true }
);

module.exports = mongoose.model("CodeSave", codeSaveSchema);
