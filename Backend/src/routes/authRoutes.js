const router = require("express").Router();
const ctrl = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");

router.post("/student/login", ctrl.studentLogin);
router.post("/admin/login", ctrl.adminLogin);
router.post("/refresh", ctrl.refresh);
router.get("/me", authenticate, ctrl.me);

module.exports = router;
