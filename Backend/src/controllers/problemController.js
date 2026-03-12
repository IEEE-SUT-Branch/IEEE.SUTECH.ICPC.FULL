const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Problem = require("../models/Problem");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.contestId) filter.contestId = req.query.contestId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;

  const problems = await Problem.find(filter).sort({ order: 1 }).lean();
  res.json({ success: true, data: problems });
});

exports.get = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id).lean();
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json({ success: true, data: problem });
});

exports.create = asyncHandler(async (req, res) => {
  const {
    contestId,
    letter,
    title,
    description,
    inputDescription,
    outputDescription,
    notes,
    timeLimitSeconds,
    memoryLimitMB,
    difficulty,
    checkerMode,
    order,
    testCases,
  } = req.body;

  if (!contestId || !letter || !title) {
    throw new ApiError(400, "contestId, letter, and title are required");
  }

  const problem = await Problem.create({
    contestId,
    letter: letter.toUpperCase(),
    title,
    description,
    inputDescription,
    outputDescription,
    notes: notes || "",
    timeLimitSeconds: timeLimitSeconds || 1,
    memoryLimitMB: memoryLimitMB || 256,
    difficulty: difficulty || "easy",
    checker: { mode: checkerMode || "token" },
    order: order || 0,
    testCases: testCases || [],
  });

  res.status(201).json({ success: true, data: problem });
});

exports.update = asyncHandler(async (req, res) => {
  const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json({ success: true, data: problem });
});

exports.remove = asyncHandler(async (req, res) => {
  const problem = await Problem.findByIdAndDelete(req.params.id);
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json({ success: true, message: "Problem deleted" });
});

exports.publish = asyncHandler(async (req, res) => {
  const problem = await Problem.findByIdAndUpdate(
    req.params.id,
    { status: "published" },
    { new: true }
  );
  if (!problem) throw new ApiError(404, "Problem not found");
  res.json({ success: true, data: problem });
});

exports.addTestCase = asyncHandler(async (req, res) => {
  const { input, expectedOutput, isVisible } = req.body;
  const problem = await Problem.findById(req.params.id);
  if (!problem) throw new ApiError(404, "Problem not found");

  problem.testCases.push({
    input: input || "",
    expectedOutput: expectedOutput || "",
    isVisible: isVisible || false,
  });
  await problem.save();

  res.status(201).json({ success: true, data: problem });
});

exports.updateTestCase = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id);
  if (!problem) throw new ApiError(404, "Problem not found");

  const tc = problem.testCases.id(req.params.tcId);
  if (!tc) throw new ApiError(404, "Test case not found");

  if (req.body.input !== undefined) tc.input = req.body.input;
  if (req.body.expectedOutput !== undefined)
    tc.expectedOutput = req.body.expectedOutput;
  if (req.body.isVisible !== undefined) tc.isVisible = req.body.isVisible;

  await problem.save();
  res.json({ success: true, data: problem });
});

exports.deleteTestCase = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id);
  if (!problem) throw new ApiError(404, "Problem not found");

  const tc = problem.testCases.id(req.params.tcId);
  if (!tc) throw new ApiError(404, "Test case not found");

  tc.deleteOne();
  await problem.save();
  res.json({ success: true, data: problem });
});

const tcUpload = multer({
  storage: multer.memoryStorage(), // Use memory storage instead of disk
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadTestCases = [
  tcUpload.array("files", 100),
  asyncHandler(async (req, res) => {
    const problem = await Problem.findById(req.params.id);
    if (!problem) throw new ApiError(404, "Problem not found");

    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, "No files uploaded");
    }

    const groups = {};
    for (const file of req.files) {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      if (!groups[base]) groups[base] = {};
      if (ext === ".in") groups[base].in = file;
      if (ext === ".out") groups[base].out = file;
    }

    let added = 0;
    for (const base of Object.keys(groups).sort()) {
      const g = groups[base];
      if (g.in && g.out) {
        // Read directly from the memory buffer!
        const input = g.in.buffer.toString("utf-8");
        const expectedOutput = g.out.buffer.toString("utf-8");
        problem.testCases.push({ input, expectedOutput, isVisible: false });
        added++;
      }
    }

    await problem.save();

    res.json({
      success: true,
      message: `${added} test case pairs added`,
      data: problem,
    });
  }),
];

exports.studentProblems = asyncHandler(async (req, res) => {
  const Contest = require("../models/Contest");
  const contest = await Contest.findOne({
    status: { $in: ["running", "paused"] },
  }).lean();
  if (!contest)
    return res.json({ success: true, data: [], message: "No active contest" });

  const filter = { contestId: contest._id, status: "published" };

  if (req.params.letter) {
    filter.letter = req.params.letter.toUpperCase();
  }

  let problems = await Problem.find(filter).sort({ order: 1 }).lean();

  // Hide hidden test cases from students
  problems = problems.map((p) => ({
    ...p,
    testCases: p.testCases.filter((tc) => tc.isVisible),
  }));

  if (req.params.letter) {
    return res.json({ success: true, data: problems[0] || null });
  }

  res.json({ success: true, data: problems });
});
