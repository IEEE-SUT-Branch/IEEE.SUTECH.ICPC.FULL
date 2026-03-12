const Student = require("../models/Student");
const Submission = require("../models/Submission");
const Contest = require("../models/Contest");
const AntiCheatLog = require("../models/AntiCheatLog");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getOnlineStudents, getIO } = require("../socket");
const judgeService = require("../services/judgeService");

exports.overview = asyncHandler(async (req, res) => {
  const contest = await Contest.findOne({
    status: { $in: ["running", "paused"] },
  }).lean();

  const onlineMap = getOnlineStudents();
  const totalStudents = await Student.countDocuments();

  let submissionCount = 0;
  let acceptedCount = 0;

  if (contest) {
    submissionCount = await Submission.countDocuments({
      contestId: contest._id,
    });
    acceptedCount = await Submission.countDocuments({
      contestId: contest._id,
      verdict: "AC",
    });
  }

  const recentAlerts = await AntiCheatLog.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("studentId", "fullName labAssignment")
    .lean();

  const queueStats = judgeService.getQueueStats();

  res.json({
    success: true,
    data: {
      contest: contest
        ? { id: contest._id, title: contest.title, status: contest.status }
        : null,
      totalStudents,
      onlineCount: onlineMap.size,
      totalSubmissions: submissionCount,
      totalAccepted: acceptedCount,
      judgeQueue: queueStats,
      recentAlerts,
    },
  });
});

exports.students = asyncHandler(async (req, res) => {
  const students = await Student.find().lean();
  const onlineMap = getOnlineStudents();

  const result = students.map((s) => {
    const sid = s._id.toString();
    const online = onlineMap.get(sid);
    let status = "offline";

    if (online) {
      status = online.flagged
        ? "flagged"
        : Date.now() - online.lastHeartbeat > 30000
        ? "idle"
        : "online";
    }

    return {
      _id: s._id,
      fullName: s.fullName,
      universityId: s.universityId,
      labAssignment: s.labAssignment,
      testGroup: s.testGroup,
      status,
      isDisqualified: s.contestSession?.isDisqualified || false,
      warningCount: s.contestSession?.warningCount || 0,
      lastHeartbeat: online?.lastHeartbeat || null,
    };
  });

  let filtered = result;
  if (req.query.lab)
    filtered = filtered.filter((s) => s.labAssignment === req.query.lab);
  if (req.query.status)
    filtered = filtered.filter((s) => s.status === req.query.status);
  if (req.query.group)
    filtered = filtered.filter((s) => s.testGroup === req.query.group);

  res.json({ success: true, count: filtered.length, data: filtered });
});

exports.labs = asyncHandler(async (req, res) => {
  const students = await Student.find().lean();
  const onlineMap = getOnlineStudents();

  const labs = {};
  students.forEach((s) => {
    const lab = s.labAssignment || "Unassigned";
    if (!labs[lab])
      labs[lab] = { total: 0, online: 0, idle: 0, offline: 0, flagged: 0 };
    labs[lab].total++;

    const sid = s._id.toString();
    const online = onlineMap.get(sid);

    if (!online) {
      labs[lab].offline++;
    } else if (online.flagged) {
      labs[lab].flagged++;
    } else if (Date.now() - online.lastHeartbeat > 30000) {
      labs[lab].idle++;
    } else {
      labs[lab].online++;
    }
  });

  res.json({ success: true, data: labs });
});

exports.warn = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const student = await Student.findById(req.params.studentId);
  if (!student) throw new ApiError(404, "Student not found");

  student.contestSession = student.contestSession || {};
  student.contestSession.warningCount =
    (student.contestSession.warningCount || 0) + 1;
  await student.save();

  await AntiCheatLog.create({
    studentId: student._id,
    eventType: "warning_sent",
    details: message || "Warning from admin",
  });

  const io = getIO();
  if (io) {
    io.to(`student:${student._id}`).emit("admin:warning", {
      message: message || "You have been warned by the judge.",
    });
  }

  res.json({
    success: true,
    message: `Warning sent to ${student.fullName}`,
    warningCount: student.contestSession.warningCount,
  });
});

exports.penalize = asyncHandler(async (req, res) => {
  const { minutes, reason } = req.body;
  if (!minutes) throw new ApiError(400, "minutes is required");

  const student = await Student.findById(req.params.studentId);
  if (!student) throw new ApiError(404, "Student not found");

  student.contestSession = student.contestSession || {};
  student.contestSession.penaltyMinutesAdded =
    (student.contestSession.penaltyMinutesAdded || 0) + minutes;
  await student.save();

  await AntiCheatLog.create({
    studentId: student._id,
    eventType: "penalty_added",
    details: `${minutes} minutes penalty. Reason: ${reason || "N/A"}`,
  });

  const io = getIO();
  if (io) {
    io.to(`student:${student._id}`).emit("admin:penalty", {
      minutes,
      reason: reason || "Penalty added by judge",
    });
  }

  res.json({
    success: true,
    message: `${minutes} min penalty added to ${student.fullName}`,
  });
});

exports.disqualify = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const student = await Student.findById(req.params.studentId);
  if (!student) throw new ApiError(404, "Student not found");

  student.contestSession = student.contestSession || {};
  student.contestSession.isDisqualified = true;
  student.contestSession.disqualifiedAt = new Date();
  student.contestSession.disqualifiedReason = reason || "Disqualified by admin";
  await student.save();

  await AntiCheatLog.create({
    studentId: student._id,
    eventType: "disqualified",
    details: reason || "Disqualified by admin",
  });

  const io = getIO();
  if (io) {
    io.to(`student:${student._id}`).emit("session:disqualified", {
      reason: reason || "You have been disqualified.",
    });
  }

  res.json({
    success: true,
    message: `${student.fullName} has been disqualified`,
  });
});
