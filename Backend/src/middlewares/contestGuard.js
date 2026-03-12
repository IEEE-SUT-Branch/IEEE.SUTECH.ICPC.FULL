const Contest = require("../models/Contest");
const Student = require("../models/Student");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const contestGuard = asyncHandler(async (req, res, next) => {
  const contest = await Contest.findOne({ status: "running" });
  if (!contest) {
    throw new ApiError(403, "No contest is currently running");
  }

  req.contest = contest;

  if (req.user.role === "student") {
    let student = await Student.findById(req.user.id);
    if (!student && req.user.email) {
      // Fallback for stale tokens when demo/student docs were recreated with new _id.
      student = await Student.findOne({ email: req.user.email.toLowerCase().trim() });
    }
    if (!student) throw new ApiError(404, "Student not found");
    if (student.contestSession?.isDisqualified) {
      throw new ApiError(403, "You have been disqualified");
    }

    const now = Date.now();
    const elapsed =
      now - contest.startedAt.getTime() - (contest.totalPausedMs || 0);
    const totalMs =
      contest.durationMinutes * 60000 +
      (student.contestSession?.bonusTimeSeconds || 0) * 1000;

    if (elapsed >= totalMs) {
      throw new ApiError(403, "Your contest time has ended");
    }

    req.student = student;
  }

  next();
});

module.exports = contestGuard;
