const CodeSave = require("../models/CodeSave");
const Contest = require("../models/Contest");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

exports.save = asyncHandler(async (req, res) => {
  const { problemId, code, language, cursorPosition } = req.body;
  if (!problemId) throw new ApiError(400, "problemId is required");

  const contest = await Contest.findOne({
    status: { $in: ["running", "paused"] },
  }).lean();
  if (!contest) throw new ApiError(403, "No active contest");

  const saved = await CodeSave.findOneAndUpdate(
    {
      studentId: req.user.id,
      problemId,
      contestId: contest._id,
    },
    {
      code: code || "",
      language: language || "cpp",
      cursorPosition: cursorPosition || { line: 0, column: 0 },
      savedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: saved });
});

exports.restore = asyncHandler(async (req, res) => {
  const contest = await Contest.findOne({
    status: { $in: ["running", "paused", "ended"] },
  }).lean();

  const saved = await CodeSave.findOne({
    studentId: req.user.id,
    problemId: req.params.problemId,
    contestId: contest?._id,
  }).lean();

  res.json({ success: true, data: saved });
});

exports.restoreAll = asyncHandler(async (req, res) => {
  const contest = await Contest.findOne({
    status: { $in: ["running", "paused", "ended"] },
  }).lean();
  if (!contest) return res.json({ success: true, data: [] });

  const saves = await CodeSave.find({
    studentId: req.user.id,
    contestId: contest._id,
  }).lean();

  res.json({ success: true, data: saves });
});
