const router = require("express").Router();
const ctrl = require("../controllers/codeSaveController");
const { authenticate } = require("../middlewares/auth");

router.use(authenticate);

router.post("/", ctrl.save);
router.get("/all", ctrl.restoreAll);
router.get("/:problemId", ctrl.restore);

module.exports = router;
