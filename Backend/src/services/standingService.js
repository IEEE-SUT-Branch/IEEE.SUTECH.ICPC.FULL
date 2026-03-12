const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const Student = require("../models/Student");
const cache = require("../utils/cache");

async function computeStandings(contestId, filters = {}) {
  const hasFilters = Object.keys(filters).length > 0;
  if (!hasFilters) {
    const cached = cache.get(`standings:${contestId}`);
    if (cached) return cached;
  }

  const problems = await Problem.find({ contestId, status: "published" })
    .sort({ order: 1 })
    .lean();

  const problemLetters = problems.map((p) => p.letter);
  const problemMap = {};
  problems.forEach((p) => {
    problemMap[p._id.toString()] = p.letter;
  });

  const submissions = await Submission.find({
    contestId,
    verdict: { $in: ["AC", "WA", "TLE", "MLE", "CE", "RE"] },
  })
    .sort({ submittedAt: 1 })
    .lean();

  const studentQuery = {};
  if (filters.lab) studentQuery.labAssignment = filters.lab;
  if (filters.group) studentQuery.testGroup = filters.group;

  const students = await Student.find(studentQuery).lean();
  const standingsMap = {};

  students.forEach((s) => {
    const sid = s._id.toString();
    standingsMap[sid] = {
      studentId: sid,
      fullName: s.fullName,
      universityId: s.universityId,
      labAssignment: s.labAssignment,
      testGroup: s.testGroup,
      isDisqualified: s.contestSession?.isDisqualified || false,
      penaltyMinutesAdded: s.contestSession?.penaltyMinutesAdded || 0,
      totalSolved: 0,
      totalPenalty: 0,
      problems: {},
    };

    problemLetters.forEach((letter) => {
      standingsMap[sid].problems[letter] = {
        solved: false,
        attempts: 0,
        solvedAtMinute: null,
      };
    });
  });

  submissions.forEach((sub) => {
    const sid = sub.studentId.toString();
    const pid = sub.problemId.toString();
    const letter = problemMap[pid];

    if (!standingsMap[sid] || !letter) return;
    const prob = standingsMap[sid].problems[letter];
    if (prob.solved) return;

    if (sub.verdict === "AC") {
      prob.solved = true;
      prob.solvedAtMinute = Math.floor(sub.elapsedMinutesFromStart || 0);
    } else if (sub.verdict !== "CE") {
      prob.attempts++;
    }
  });

  Object.values(standingsMap).forEach((entry) => {
    Object.values(entry.problems).forEach((prob) => {
      if (prob.solved) {
        entry.totalSolved++;
        entry.totalPenalty += prob.solvedAtMinute + prob.attempts * 20;
      }
    });
    // Add admin-applied penalty minutes to total
    entry.totalPenalty += entry.penaltyMinutesAdded;
  });

  let standings = Object.values(standingsMap);

  if (filters.minSolved) {
    standings = standings.filter(
      (s) => s.totalSolved >= parseInt(filters.minSolved)
    );
  }

  standings.sort((a, b) => {
    if (b.totalSolved !== a.totalSolved) return b.totalSolved - a.totalSolved;
    return a.totalPenalty - b.totalPenalty;
  });

  standings.forEach((s, i) => {
    s.rank = i + 1;
  });

  if (!hasFilters) {
    cache.set(`standings:${contestId}`, standings, 3000);
  }

  return standings;
}

function invalidateCache(contestId) {
  cache.del(`standings:${contestId}`);
}

module.exports = { computeStandings, invalidateCache };
