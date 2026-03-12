const router = require("express").Router();
const ctrl   = require("../controllers/polygonController");
const { authenticate, requireRole } = require("../middlewares/auth");

router.use(authenticate, requireRole("admin", "judge"));

router.post("/problems", ctrl.listProblems);
router.post("/import",   ctrl.importProblem);

module.exports = router;
