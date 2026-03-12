const AntiCheatLog = require("../models/AntiCheatLog");
const Contest = require("../models/Contest");
const Submission = require("../models/Submission");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getIO } = require("../socket");

exports.reportEvent = asyncHandler(async (req, res) => {
  const { eventType, details } = req.body;
  if (!eventType) throw new ApiError(400, "eventType is required");

  const contest = await Contest.findOne({ status: "running" }).lean();

  const log = await AntiCheatLog.create({
    studentId: req.user.id,
    contestId: contest?._id,
    eventType,
    details: details || "",
  });

  const io = getIO();
  if (io) {
    io.to("admins").emit("anticheat:alert", {
      _id: log._id,
      studentId: req.user.id,
      studentName: req.user.fullName,
      lab: req.user.lab,
      eventType,
      details,
      timestamp: log.createdAt,
    });
  }

  res.json({ success: true, message: "Event logged" });
});

exports.getLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.contestId) filter.contestId = req.query.contestId;

  const logs = await AntiCheatLog.find(filter)
    .populate("studentId", "fullName universityId labAssignment")
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 500)
    .lean();

  res.json({ success: true, count: logs.length, data: logs });
});

exports.studentLogs = asyncHandler(async (req, res) => {
  const logs = await AntiCheatLog.find({ studentId: req.params.studentId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, count: logs.length, data: logs });
});

exports.acknowledge = asyncHandler(async (req, res) => {
  const log = await AntiCheatLog.findByIdAndUpdate(
    req.params.id,
    { acknowledged: true },
    { new: true }
  );
  if (!log) throw new ApiError(404, "Log not found");
  res.json({ success: true, data: log });
});

exports.plagiarismCheck = asyncHandler(async (req, res) => {
  const { contestId } = req.body;
  if (!contestId) throw new ApiError(400, "contestId is required");

  const submissions = await Submission.find({
    contestId,
    verdict: "AC",
  })
    .populate("studentId", "fullName universityId")
    .populate("problemId", "letter")
    .lean();

  const byProblem = {};
  submissions.forEach((s) => {
    const letter = s.problemId?.letter || "?";
    if (!byProblem[letter]) byProblem[letter] = [];
    byProblem[letter].push(s);
  });

  const suspiciousPairs = [];

  for (const [letter, subs] of Object.entries(byProblem)) {
    for (let i = 0; i < subs.length; i++) {
      for (let j = i + 1; j < subs.length; j++) {
        const similarity = computeSimilarity(subs[i].code, subs[j].code);
        if (similarity > 0.85) {
          suspiciousPairs.push({
            problem: letter,
            student1: {
              id: subs[i].studentId?._id,
              name: subs[i].studentId?.fullName,
            },
            student2: {
              id: subs[j].studentId?._id,
              name: subs[j].studentId?.fullName,
            },
            similarity: Math.round(similarity * 100) + "%",
            submissionIds: [subs[i]._id, subs[j]._id],
          });
        }
      }
    }
  }

  res.json({
    success: true,
    message: `Found ${suspiciousPairs.length} suspicious pairs`,
    data: suspiciousPairs,
  });
});

function computeSimilarity(code1, code2) {
  const a = (code1 || "").replace(/\s+/g, " ").trim();
  const b = (code2 || "").replace(/\s+/g, " ").trim();

  if (a === b) return 1;
  if (!a || !b) return 0;

  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      set.add(s.substring(i, i + 2));
    }
    return set;
  };

  const setA = bigrams(a);
  const setB = bigrams(b);

  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }

  return (2 * intersection) / (setA.size + setB.size);
}
