const router = require("express").Router();
const ctrl = require("../controllers/submissionController");
const { authenticate, requireRole } = require("../middlewares/auth");
const contestGuard = require("../middlewares/contestGuard");

// ── Simple in-memory rate limiter (replaces express-rate-limit) ──
const lastSubmit = new Map();
function submitLimiter(req, res, next) {
  const key = req.user?.id || req.ip;
  const now = Date.now();
  const last = lastSubmit.get(key) || 0;

  if (now - last < 10000) {
    return res.status(429).json({
      success: false,
      message: "Wait 10 seconds between submissions",
    });
  }

  lastSubmit.set(key, now);
  next();
}

router.use(authenticate);

// Student
router.post("/", contestGuard, submitLimiter, ctrl.submit);
router.post("/run", contestGuard, ctrl.run);
router.get("/my", ctrl.mySubmissions);
router.get("/my/:problemLetter", ctrl.mySubmissions);

// Admin
router.get("/", requireRole("admin", "judge"), ctrl.listAll);
router.get("/:id", requireRole("admin", "judge"), ctrl.getOne);

module.exports = router;
