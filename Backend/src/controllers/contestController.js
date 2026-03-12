const Contest = require("../models/Contest");
const Student = require("../models/Student");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const standingService = require("../services/standingService");
const { getIO } = require("../socket");

exports.create = asyncHandler(async (req, res) => {
  const { title, description, durationMinutes, allowedLanguages, type } =
    req.body;
  if (!title) throw new ApiError(400, "Title is required");

  const contest = await Contest.create({
    title,
    description,
    durationMinutes: durationMinutes || 60,
    allowedLanguages: allowedLanguages || ["cpp", "python", "java"],
    type: type || "placement",
  });

  res.status(201).json({ success: true, data: contest });
});

exports.list = asyncHandler(async (req, res) => {
  const contests = await Contest.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: contests });
});

exports.get = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id).lean();
  if (!contest) throw new ApiError(404, "Contest not found");
  res.json({ success: true, data: contest });
});

exports.update = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (contest.status === "running" || contest.status === "paused") {
    const allowedWhileLive = ["durationMinutes"];
    const hasBlockedField = Object.keys(req.body).some(
      (field) => !allowedWhileLive.includes(field)
    );

    if (hasBlockedField) {
      throw new ApiError(
        400,
        "Only durationMinutes can be edited while contest is running or paused"
      );
    }
  }

  Object.assign(contest, req.body);
  await contest.save();

  const io = getIO();
  if (io) {
    io.emit("contest:updated", {
      contestId: contest._id,
      status: contest.status,
      durationMinutes: contest.durationMinutes,
    });
  }

  res.json({ success: true, data: contest });
});

exports.start = asyncHandler(async (req, res) => {
  const running = await Contest.findOne({ status: "running" });
  if (running) throw new ApiError(400, "Another contest is already running");

  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (contest.status === "not_started") {
    contest.status = "running";
    contest.startedAt = new Date();
  } else if (contest.status === "paused") {
    const pausedDuration = Date.now() - contest.pausedAt.getTime();
    contest.totalPausedMs = (contest.totalPausedMs || 0) + pausedDuration;
    contest.status = "running";
    contest.pausedAt = null;
  } else {
    throw new ApiError(400, `Cannot start from status: ${contest.status}`);
  }

  await contest.save();

  const io = getIO();
  if (io)
    io.emit("contest:started", {
      contestId: contest._id,
      startedAt: contest.startedAt,
    });

  res.json({ success: true, message: "Contest started", data: contest });
});

exports.pause = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, "Contest not found");
  if (contest.status !== "running")
    throw new ApiError(400, "Contest is not running");

  contest.status = "paused";
  contest.pausedAt = new Date();
  await contest.save();

  const io = getIO();
  if (io) io.emit("contest:paused", { contestId: contest._id });

  res.json({ success: true, message: "Contest paused", data: contest });
});

exports.resume = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, "Contest not found");
  if (contest.status !== "paused")
    throw new ApiError(400, "Contest is not paused");

  const pausedDuration = Date.now() - contest.pausedAt.getTime();
  contest.totalPausedMs = (contest.totalPausedMs || 0) + pausedDuration;
  contest.status = "running";
  contest.pausedAt = null;
  await contest.save();

  const io = getIO();
  if (io) io.emit("contest:resumed", { contestId: contest._id });

  res.json({ success: true, message: "Contest resumed", data: contest });
});

exports.end = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (contest.status === "paused") {
    const pausedDuration = Date.now() - contest.pausedAt.getTime();
    contest.totalPausedMs = (contest.totalPausedMs || 0) + pausedDuration;
  }

  contest.status = "ended";
  contest.endedAt = new Date();
  await contest.save();

  standingService.invalidateCache(contest._id.toString());

  const io = getIO();
  if (io) io.emit("contest:ended", { contestId: contest._id });

  res.json({ success: true, message: "Contest ended", data: contest });
});

exports.extendTime = asyncHandler(async (req, res) => {
  const { studentId, extraMinutes } = req.body;
  if (!studentId || !extraMinutes) {
    throw new ApiError(400, "studentId and extraMinutes are required");
  }

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "Student not found");

  student.contestSession = student.contestSession || {};
  const bonus =
    (student.contestSession.bonusTimeSeconds || 0) + extraMinutes * 60;
  student.contestSession.bonusTimeSeconds = bonus;
  await student.save();

  const io = getIO();
  if (io) {
    io.to(`student:${studentId}`).emit("time:sync", {
      bonusSeconds: bonus,
      message: `You received ${extraMinutes} extra minutes`,
    });
  }

  res.json({
    success: true,
    message: `Added ${extraMinutes} minutes to ${student.fullName}`,
    data: { totalBonusSeconds: bonus },
  });
});

exports.timer = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id).lean();
  if (!contest) throw new ApiError(404, "Contest not found");

  let remainingMs = null;
  let elapsedMs = null;

  if (contest.status === "not_started") {
    remainingMs = contest.durationMinutes * 60000;
    elapsedMs = 0;
  }

  if (contest.status === "running" || contest.status === "paused") {
    const referenceTime =
      contest.status === "paused" && contest.pausedAt
        ? contest.pausedAt.getTime()
        : Date.now();

    elapsedMs =
      referenceTime - contest.startedAt.getTime() - (contest.totalPausedMs || 0);
    const totalMs = contest.durationMinutes * 60000;

    let bonusMs = 0;
    if (req.user?.role === "student") {
      const student = await Student.findById(req.user.id).lean();
      bonusMs = (student?.contestSession?.bonusTimeSeconds || 0) * 1000;
    }

    remainingMs = Math.max(0, totalMs + bonusMs - elapsedMs);
  }

  if (contest.status === "ended") {
    remainingMs = 0;
    if (contest.startedAt) {
      const stopAt = contest.endedAt ? contest.endedAt.getTime() : Date.now();
      elapsedMs =
        stopAt - contest.startedAt.getTime() - (contest.totalPausedMs || 0);
    }
  }

  res.json({
    success: true,
    data: {
      status: contest.status,
      serverTime: Date.now(),
      startedAt: contest.startedAt,
      durationMinutes: contest.durationMinutes,
      totalPausedMs: contest.totalPausedMs || 0,
      elapsedMs,
      remainingMs,
    },
  });
});

exports.active = asyncHandler(async (req, res) => {
  const contest = await Contest.findOne({
    status: { $in: ["running", "paused"] },
  }).lean();

  if (!contest) {
    return res.json({
      success: true,
      data: null,
      message: "No active contest",
    });
  }

  res.json({ success: true, data: contest });
});
