const router = require("express").Router();
const ctrl = require("../controllers/problemController");
const { authenticate, requireRole } = require("../middlewares/auth");

router.use(authenticate);

// Student-facing
router.get("/contest", ctrl.studentProblems);
router.get("/contest/:letter", ctrl.studentProblems);

// Admin
router.get("/", ctrl.list);
router.post("/", requireRole("admin", "judge"), ctrl.create);
router.get("/:id", ctrl.get);
router.put("/:id", requireRole("admin", "judge"), ctrl.update);
router.delete("/:id", requireRole("admin"), ctrl.remove);
router.patch("/:id/publish", requireRole("admin", "judge"), ctrl.publish);

router.post("/:id/test-cases", requireRole("admin", "judge"), ctrl.addTestCase);
router.post(
  "/:id/test-cases/bulk-upload",
  requireRole("admin", "judge"),
  ctrl.uploadTestCases
);
router.put(
  "/:id/test-cases/:tcId",
  requireRole("admin", "judge"),
  ctrl.updateTestCase
);
router.delete(
  "/:id/test-cases/:tcId",
  requireRole("admin", "judge"),
  ctrl.deleteTestCase
);

module.exports = router;
