const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const Contest = require("../models/Contest");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const judgeService = require("../services/judgeService");
const standingService = require("../services/standingService");
const { getIO } = require("../socket");
const logger = require("../config/logger");
const env = require("../config/env");

const MAX_CODE_CHARS = env.judge.maxCodeChars;

function getElapsedMinutes(contest) {
  const elapsed =
    Date.now() - contest.startedAt.getTime() - (contest.totalPausedMs || 0);
  return elapsed / 60000;
}

function sanitizeRunResultsForStudent(runResult) {
  const results = (runResult.results || []).map((r) => ({
    testCaseIndex: r.testCaseIndex,
    verdict: r.verdict || (r.passed ? "AC" : "WA"),
    passed: Boolean(r.passed),
    executionTimeMs: r.executionTimeMs ?? null,
  }));

  return {
    judgeBackend: runResult.judgeBackend || null,
    compilationError: runResult.compilationError ? "Compilation failed" : null,
    results,
    summary: runResult.summary || {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    },
  };
}

function sanitizeSubmissionForStudent(submission) {
  return {
    _id: submission._id,
    problemId: submission.problemId,
    language: submission.language,
    verdict: submission.verdict,
    isAccepted: submission.isAccepted,
    executionTimeMs: submission.executionTimeMs,
    submittedAt: submission.submittedAt,
    judgedAt: submission.judgedAt,
    elapsedMinutesFromStart: submission.elapsedMinutesFromStart,
  };
}

exports.submit = asyncHandler(async (req, res) => {
  const { problemId, code, language } = req.body;
  if (!problemId || !code || !language) {
    throw new ApiError(400, "problemId, code, and language are required");
  }

  if (code.length > MAX_CODE_CHARS) {
    throw new ApiError(400, "Code is too large");
  }

  const contest = req.contest;
  const student = req.student;

  if (!contest.allowedLanguages.includes(language)) {
    throw new ApiError(400, `Language ${language} is not allowed`);
  }

  const problem = await Problem.findOne({
    _id: problemId,
    contestId: contest._id,
    status: "published",
  });
  if (!problem) throw new ApiError(404, "Problem not found");

  const submission = await Submission.create({
    studentId: student._id,
    problemId: problem._id,
    contestId: contest._id,
    code,
    language,
    verdict: "queued",
    elapsedMinutesFromStart: getElapsedMinutes(contest),
  });

  const io = getIO();
  if (io) {
    io.to("admins").emit("submission:new", {
      submissionId: submission._id,
      studentName: student.fullName,
      lab: student.labAssignment,
      problemLetter: problem.letter,
      language,
      timestamp: submission.submittedAt,
      verdict: "queued",
    });
  }

  res.status(202).json({
    success: true,
    message: "Submission queued for judging",
    data: { submissionId: submission._id, verdict: "queued" },
  });

  // Background judging
  (async () => {
    try {
      submission.verdict = "judging";
      await submission.save();

      const result = await judgeService.judgeQueued(
        code,
        language,
        problem.testCases,
        problem.timeLimitSeconds,
        problem.memoryLimitMB,
        problem.checker?.mode
      );

      submission.verdict = result.verdict;
      submission.judgeBackend = result.judgeBackend || null;
      submission.testCaseResults = result.testCaseResults || [];
      submission.executionTimeMs =
        (result.testCaseResults || []).reduce(
          (max, tc) => Math.max(max, tc.executionTimeMs || 0),
          0
        ) || null;
      submission.isAccepted = result.verdict === "AC";
      submission.judgedAt = new Date();
      await submission.save();

      standingService.invalidateCache(contest._id.toString());

      if (io) {
        io.to(`student:${student._id}`).emit("submission:verdict", {
          submissionId: submission._id,
          problemLetter: problem.letter,
          verdict: result.verdict,
        });

        io.to("admins").emit("submission:judged", {
          submissionId: submission._id,
          studentName: student.fullName,
          lab: student.labAssignment,
          problemLetter: problem.letter,
          language,
          verdict: result.verdict,
          timestamp: new Date(),
        });

        if (result.verdict === "AC") {
          const standings = await standingService.computeStandings(
            contest._id.toString()
          );
          io.to("admins").emit("standings:update", standings);
        }
      }
    } catch (err) {
      logger.error("Judge error:", err.message);
      submission.verdict = "RE";
      submission.judgeBackend = null;
      submission.testCaseResults = [{ passed: false, stderr: err.message }];
      submission.judgedAt = new Date();
      await submission.save();

      if (io) {
        io.to(`student:${student._id}`).emit("submission:verdict", {
          submissionId: submission._id,
          verdict: "RE",
          error: "Internal judging error",
        });
      }
    }
  })();
});

exports.run = asyncHandler(async (req, res) => {
  const { problemId, code, language } = req.body;
  if (!problemId || !code || !language) {
    throw new ApiError(400, "problemId, code, and language are required");
  }

  if (code.length > MAX_CODE_CHARS) {
    throw new ApiError(400, "Code is too large");
  }

  const problem = await Problem.findById(problemId);
  if (!problem) throw new ApiError(404, "Problem not found");

  const visibleCases = problem.testCases.filter((tc) => tc.isVisible);
  if (visibleCases.length === 0) {
    throw new ApiError(400, "No sample test cases available");
  }

  const result = await judgeService.runSamples(
    code,
    language,
    visibleCases,
    problem.timeLimitSeconds,
    problem.memoryLimitMB,
    problem.checker?.mode
  );

  res.json({ success: true, data: sanitizeRunResultsForStudent(result) });
});

exports.mySubmissions = asyncHandler(async (req, res) => {
  const contest = await Contest.findOne({
    status: { $in: ["running", "paused", "ended"] },
  }).sort({ startedAt: -1 });

  if (!contest) return res.json({ success: true, data: [] });

  const filter = { studentId: req.user.id, contestId: contest._id };

  if (req.params.problemLetter) {
    const problem = await Problem.findOne({
      contestId: contest._id,
      letter: req.params.problemLetter.toUpperCase(),
    });
    if (problem) filter.problemId = problem._id;
  }

  const submissions = await Submission.find(filter)
    .populate("problemId", "letter title")
    .sort({ submittedAt: -1 })
    .lean();

  res.json({
    success: true,
    data: submissions.map(sanitizeSubmissionForStudent),
  });
});

exports.listAll = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.contestId) filter.contestId = req.query.contestId;
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.verdict) filter.verdict = req.query.verdict;
  if (req.query.language) filter.language = req.query.language;

  const submissions = await Submission.find(filter)
    .populate("studentId", "fullName universityId labAssignment")
    .populate("problemId", "letter title")
    .sort({ submittedAt: -1 })
    .limit(parseInt(req.query.limit) || 200)
    .lean();

  res.json({ success: true, count: submissions.length, data: submissions });
});

exports.getOne = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate("studentId", "fullName universityId labAssignment")
    .populate("problemId", "letter title")
    .lean();

  if (!submission) throw new ApiError(404, "Submission not found");
  res.json({ success: true, data: submission });
});
