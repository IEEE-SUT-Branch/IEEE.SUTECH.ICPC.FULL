const standingService = require("../services/standingService");
const Contest = require("../models/Contest");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

exports.get = asyncHandler(async (req, res) => {
  let contest;
  if (req.query.contestId) {
    contest = await Contest.findById(req.query.contestId).lean();
  } else {
    contest = await Contest.findOne({
      status: { $in: ["running", "paused", "ended"] },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  if (!contest) {
    return res.json({ success: true, contestId: null, contestStatus: null, count: 0, data: [] });
  }

  const filters = {};
  if (req.query.lab) filters.lab = req.query.lab;
  if (req.query.group) filters.group = req.query.group;
  if (req.query.minSolved) filters.minSolved = req.query.minSolved;

  const standings = await standingService.computeStandings(
    contest._id.toString(),
    filters
  );

  res.json({
    success: true,
    contestId: contest._id,
    contestStatus: contest.status,
    count: standings.length,
    data: standings,
  });
});

exports.exportCsv = asyncHandler(async (req, res) => {
  let contest;
  if (req.query.contestId) {
    contest = await Contest.findById(req.query.contestId).lean();
  } else {
    contest = await Contest.findOne({
      status: { $in: ["running", "paused", "ended"] },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  if (!contest) throw new ApiError(404, "No contest found");

  const standings = await standingService.computeStandings(
    contest._id.toString()
  );

  const headers = [
    "Rank",
    "Name",
    "University ID",
    "Lab",
    "Group",
    "Solved",
    "Penalty",
    "Disqualified",
  ];
  const rows = standings.map((s) => [
    s.rank,
    `"${s.fullName}"`,
    s.universityId,
    s.labAssignment,
    s.testGroup,
    s.totalSolved,
    s.totalPenalty,
    s.isDisqualified ? "Yes" : "No",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=standings-${contest._id}.csv`
  );
  res.send(csv);
});

exports.studentStats = asyncHandler(async (req, res) => {
  const contest = await Contest.findOne({
    status: { $in: ["running", "paused", "ended"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!contest) throw new ApiError(404, "No contest found");

  const standings = await standingService.computeStandings(
    contest._id.toString()
  );
  const student = standings.find((s) => s.studentId === req.params.id);

  if (!student) throw new ApiError(404, "Student not found in standings");
  res.json({ success: true, data: student });
});
