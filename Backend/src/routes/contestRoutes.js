const router = require("express").Router();
const ctrl = require("../controllers/contestController");
const { authenticate, requireRole } = require("../middlewares/auth");

router.use(authenticate);

router.get("/active", ctrl.active);
router.get("/:id/timer", ctrl.timer);

router.post("/", requireRole("admin"), ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.put("/:id", requireRole("admin"), ctrl.update);
router.post("/:id/start", requireRole("admin"), ctrl.start);
router.post("/:id/pause", requireRole("admin"), ctrl.pause);
router.post("/:id/resume", requireRole("admin"), ctrl.resume);
router.post("/:id/end", requireRole("admin"), ctrl.end);
router.post("/:id/extend-time", requireRole("admin", "judge"), ctrl.extendTime);

module.exports = router;
