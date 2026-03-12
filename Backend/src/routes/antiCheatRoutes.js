const router = require("express").Router();
const ctrl = require("../controllers/antiCheatController");
const { authenticate, requireRole } = require("../middlewares/auth");

router.use(authenticate);

router.post("/event", ctrl.reportEvent);
router.get("/logs", requireRole("admin", "judge"), ctrl.getLogs);
router.get("/logs/:studentId", requireRole("admin", "judge"), ctrl.studentLogs);
router.patch(
  "/logs/:id/acknowledge",
  requireRole("admin", "judge"),
  ctrl.acknowledge
);
router.post("/plagiarism-check", requireRole("admin"), ctrl.plagiarismCheck);

module.exports = router;
