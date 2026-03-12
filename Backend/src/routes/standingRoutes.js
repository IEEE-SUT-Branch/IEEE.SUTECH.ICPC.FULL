const router = require("express").Router();
const ctrl = require("../controllers/standingController");
const { authenticate, requireRole } = require("../middlewares/auth");

router.use(authenticate);

router.get("/", ctrl.get);
router.get("/export", requireRole("admin", "judge"), ctrl.exportCsv);
router.get("/student/:id", ctrl.studentStats);

module.exports = router;
