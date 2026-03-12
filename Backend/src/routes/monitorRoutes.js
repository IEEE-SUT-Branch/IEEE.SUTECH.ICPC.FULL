const router = require("express").Router();
const ctrl = require("../controllers/monitorController");
const { authenticate, requireRole } = require("../middlewares/auth");

router.use(authenticate, requireRole("admin", "judge"));

router.get("/overview", ctrl.overview);
router.get("/students", ctrl.students);
router.get("/labs", ctrl.labs);
router.post("/warn/:studentId", ctrl.warn);
router.post("/penalize/:studentId", ctrl.penalize);
router.post("/disqualify/:studentId", ctrl.disqualify);

module.exports = router;
