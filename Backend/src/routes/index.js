const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/emailController");

const router = Router();

const storage = multer.memoryStorage(); // <-- Use memory storage!
const upload = multer({ storage: storage });

// ═══════════════════════════════════════════════════════════
// EMAIL SYSTEM ROUTES — protected by x-api-key (unchanged)
// (moved from router.use(authMiddleware) to per-route)
// ═══════════════════════════════════════════════════════════
router.post(
  "/students/upload-csv",
  authMiddleware,
  upload.single("file"),
  ctrl.uploadCSV
);
router.get("/students", authMiddleware, ctrl.getStudents);
router.post("/emails/send-all", authMiddleware, ctrl.sendAll);
router.post("/emails/send-one", authMiddleware, ctrl.sendOne);
router.get("/emails/status", authMiddleware, ctrl.getStatus);
router.post("/emails/retry-failed", authMiddleware, ctrl.retryFailed);
router.post("/emails/reset", authMiddleware, ctrl.resetEmails);
router.post("/emails/test", authMiddleware, ctrl.testEmail);
router.get("/lab-passwords", authMiddleware, ctrl.getLabPasswords);

// ═══════════════════════════════════════════════════════════
// CONTEST SYSTEM ROUTES — protected by JWT (new)
// ═══════════════════════════════════════════════════════════
router.use("/auth", require("./authRoutes"));
router.use("/problems", require("./problemRoutes"));
router.use("/contests", require("./contestRoutes"));
router.use("/submissions", require("./submissionRoutes"));
router.use("/standings", require("./standingRoutes"));
router.use("/monitor", require("./monitorRoutes"));
router.use("/anticheat", require("./antiCheatRoutes"));
router.use("/code-save", require("./codeSaveRoutes"));
router.use("/polygon",   require("./polygonRoutes"));

module.exports = router;
