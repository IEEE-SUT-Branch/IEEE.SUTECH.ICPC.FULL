const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Student = require("../models/Student");
const { parseCSV } = require("../services/csvService");
const emailService = require("../services/emailService");
const {
  assignLabPasswords,
  getLabPasswordSummary,
} = require("../services/labPasswordService");

/**
 * POST /api/students/upload-csv
 */
exports.uploadCSV = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No CSV file uploaded. Use form field name: file");
  }

  const { students, errors } = await parseCSV(req.file.buffer || req.file.path);

  if (students.length === 0) {
    throw new ApiError(
      400,
      "No valid students found in CSV. Check column names."
    );
  }

  let inserted = 0;
  let skipped = 0;
  const skippedList = [];

  for (const s of students) {
    try {
      await Student.create(s);
      inserted++;
    } catch (error) {
      if (error.code === 11000) {
        skipped++;
        skippedList.push(s.email);
      } else {
        throw error;
      }
    }
  }

  const passwordsAssigned = await assignLabPasswords();

  res.status(201).json({
    success: true,
    message: "CSV processed successfully",
    data: {
      totalInCSV: students.length + errors.length,
      validRows: students.length,
      inserted,
      skippedDuplicates: skipped,
      skippedEmails: skippedList,
      passwordsAssigned,
      csvErrors: errors,
    },
  });
});

/**
 * GET /api/students
 */
exports.getStudents = asyncHandler(async (req, res) => {
  const { group, lab, status } = req.query;

  const filter = {};
  if (group) filter.testGroup = group;
  if (lab) filter.labAssignment = lab;
  if (status === "sent") filter.emailSent = true;
  if (status === "pending") filter.emailSent = false;

  const students = await Student.find(filter)
    .sort({ testGroup: 1, labAssignment: 1, fullName: 1 })
    .lean();

  const summary = {
    total: students.length,
    emailSent: students.filter((s) => s.emailSent).length,
    emailPending: students.filter((s) => !s.emailSent).length,
  };

  res.json({ success: true, summary, data: students });
});

/**
 * POST /api/emails/send-all
 */
exports.sendAll = asyncHandler(async (req, res) => {
  const { group, lab } = req.body;

  const filter = {};
  if (group) filter.testGroup = group;
  if (lab) filter.labAssignment = lab;

  // Count how many will be sent
  const pendingCount = await Student.countDocuments({
    emailSent: false,
    ...filter,
  });

  res.json({
    success: true,
    message: `Email dispatch started for ${pendingCount} students. Check GET /api/emails/status for progress.`,
    pendingCount,
  });

  emailService.sendAllPending(filter);
});

/**
 * POST /api/emails/send-one
 */
exports.sendOne = asyncHandler(async (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    throw new ApiError(400, "studentId is required");
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  try {
    const info = await emailService.sendCredentialEmail(student);

    student.emailSent = true;
    student.emailSentAt = new Date();
    student.emailError = null;
    await student.save();

    res.json({
      success: true,
      message: `Email sent to ${student.email}`,
      data: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      },
    });
  } catch (error) {
    student.emailError = error.message;
    await student.save();
    throw new ApiError(500, `Failed to send email: ${error.message}`);
  }
});

/**
 * GET /api/emails/status
 */
exports.getStatus = asyncHandler(async (req, res) => {
  const [total, sent, failed, pending] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ emailSent: true }),
    Student.countDocuments({ emailError: { $ne: null }, emailSent: false }),
    Student.countDocuments({ emailSent: false, emailError: null }),
  ]);

  const failedStudents = await Student.find(
    { emailError: { $ne: null }, emailSent: false },
    "fullName email emailError"
  ).lean();

  res.json({
    success: true,
    data: {
      total,
      sent,
      pending,
      failed,
      failedStudents,
      progress: total > 0 ? `${Math.round((sent / total) * 100)}%` : "0%",
    },
  });
});

/**
 * POST /api/emails/retry-failed
 */
exports.retryFailed = asyncHandler(async (req, res) => {
  const result = await Student.updateMany(
    { emailSent: false, emailError: { $ne: null } },
    { $set: { emailError: null } }
  );

  res.json({
    success: true,
    message: `${result.modifiedCount} failed emails reset. Call POST /api/emails/send-all to retry.`,
  });
});

/**
 * POST /api/emails/reset
 * Reset emailSent status for students (to resend).
 * Use with caution — students will get duplicate emails.
 */
exports.resetEmails = asyncHandler(async (req, res) => {
  const { email, group, lab, resetAll } = req.body;

  if (!email && !group && !lab && !resetAll) {
    throw new ApiError(
      400,
      "Provide email, group, lab, or resetAll:true to specify what to reset"
    );
  }

  const filter = {};
  if (email) filter.email = email.toLowerCase();
  if (group) filter.testGroup = group;
  if (lab) filter.labAssignment = lab;
  if (resetAll) {
    // no additional filter — reset all
  }

  const result = await Student.updateMany(filter, {
    $set: { emailSent: false, emailSentAt: null, emailError: null },
  });

  res.json({
    success: true,
    message: `${result.modifiedCount} students reset. They will receive emails on next send-all.`,
  });
});

/**
 * POST /api/emails/test
 * Send a DIAGNOSTIC test email to a specific address.
 * Returns the full SMTP conversation and analysis.
 */
exports.testEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "email is required — the address you want to test");
  }

  const result = await emailService.sendDiagnosticEmail(email);

  res.json({
    success: result.success,
    message: result.success
      ? "Email handed to Gmail for delivery — see diagnosis below"
      : "Email failed to send — see error details below",
    data: result,
  });
});

/**
 * GET /api/lab-passwords
 */
exports.getLabPasswords = asyncHandler(async (req, res) => {
  const summary = await getLabPasswordSummary();

  res.json({
    success: true,
    message:
      "Print this and give to lab proctors. They announce the password at test start.",
    data: summary,
  });
});
