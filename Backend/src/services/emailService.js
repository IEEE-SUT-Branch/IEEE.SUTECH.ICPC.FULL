const { transporter, createDebugTransporter } = require("../config/mailer");
const templateService = require("./templateService");
const Student = require("../models/Student");
const env = require("../config/env");
const logger = require("../config/logger");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Detect active backend for diagnostic messages
const activeBackend = env.powerAutomate.webhookUrl
  ? "powerautomate"
  : env.azure.tenantId
  ? "graph"
  : "smtp";

/**
 * Builds mail options for a student.
 * Extracted so both normal send and diagnostic send use the same config.
 */
const buildMailOptions = (student) => {
  const senderEmail = env.smtp.fromEmail || env.smtp.user;

  const context = {
    studentName: student.fullName,
    loginUsername: student.email,
    labAssignment: student.labAssignment,
    testGroup: student.testGroup,
    testDate:
      student.testGroup === "Group1"
        ? "Thursday, March 12, 2026"
        : student.testGroup === "Group2"
        ? "Thursday, March 19, 2026"
        : "Thursday, March 12, 2026",
    testDuration: "60 minutes",
    problemCount: 5,
    supportedLanguages: "C++, Python, Java",
    platformUrl: "https://ieee.reca-tech.com",
    supportEmail: senderEmail,
    logoUrl: `${env.baseUrl}/logo1.png`,
  };

  const html = templateService.render("placementTest", context);

  return {
    from: `"${env.smtp.fromName}" <${senderEmail}>`,
    to: student.email,
    subject: "ECPC Placement Test (Stage 1) — Your Schedule & Login Details",
    html,
    replyTo: `"${env.smtp.fromName}" <${senderEmail}>`,
    headers: {
      "X-Mailer": "SUTech-Email-Automation",
      "X-Priority": "3",
      Precedence: "bulk",
    },
  };
};

/**
 * Sends a single credential email.
 */
const sendCredentialEmail = async (student) => {
  const mailOptions = buildMailOptions(student);
  const info = await transporter.sendMail(mailOptions);

  logger.info(`Email to ${student.email}:`, {
    messageId: info.messageId,
    response: info.response,
    accepted: info.accepted,
    rejected: info.rejected,
  });

  return info;
};

/**
 * DIAGNOSTIC: Sends a test email and returns a full report.
 * Uses the active backend (Power Automate / Graph API / SMTP).
 */
const sendDiagnosticEmail = async (toEmail) => {
  const testStudent = {
    fullName: "Test Student",
    email: toEmail,
    universityId: "TEST000",
    labAssignment: "Lab 5",
    testGroup: "Sunday",
  };

  const mailOptions = buildMailOptions(testStudent);

  const result = {
    success: false,
    toEmail,
    backend: activeBackend,
    senderEmail: env.smtp.fromEmail || env.smtp.user,
    timestamp: new Date().toISOString(),
    response: null,
    diagnosis: [],
    suggestions: [],
  };

  try {
    let info;

    if (activeBackend === "smtp") {
      // SMTP: use debug transporter for full conversation log
      const { debugTransporter, debugLogs } = createDebugTransporter();
      info = await debugTransporter.sendMail(mailOptions);
      result.smtpConversation = debugLogs;
    } else {
      // Power Automate or Graph API
      info = await transporter.sendMail(mailOptions);
    }

    result.success = true;
    result.response = {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    };

    if (info.accepted && info.accepted.includes(toEmail)) {
      result.diagnosis.push(`Email accepted for delivery to ${toEmail}`);
      if (activeBackend === "powerautomate") {
        result.diagnosis.push(
          "Power Automate queued the email — it will be sent from IEEE.SUTech@sut.edu.eg"
        );
      }
    }
  } catch (error) {
    result.success = false;
    result.error = {
      message: error.message,
      code: error.code,
    };

    result.diagnosis.push(`Email FAILED: ${error.message}`);

    if (activeBackend === "powerautomate") {
      result.suggestions = [
        "Check that POWER_AUTOMATE_WEBHOOK_URL is correctly set in .env",
        "Verify the Power Automate flow is turned ON (not disabled)",
        "Make sure the flow is saved after the last edit",
        "Test the webhook manually via Postman with: POST the URL with body { to, subject, html }",
      ];
    } else if (activeBackend === "smtp" && error.code === "EAUTH") {
      result.suggestions = [
        "Office365 has disabled Basic Auth — switch to Power Automate or Graph API",
      ];
    }
  }

  return result;
};

/**
 * Sends emails to all unsent students with a delay between each.
 */
const sendAllPending = async (filter = {}) => {
  const query = { emailSent: false, ...filter };
  const students = await Student.find(query).sort({
    testGroup: 1,
    labAssignment: 1,
  });

  if (students.length === 0) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      message: "No pending students found",
    };
  }

  logger.info(`Starting email dispatch to ${students.length} students via ${activeBackend}...`);

  let sent = 0;
  let failed = 0;
  const failedList = [];

  for (const student of students) {
    try {
      const info = await sendCredentialEmail(student);

      student.emailSent = true;
      student.emailSentAt = new Date();
      student.emailError = null;
      await student.save();

      sent++;
      logger.info(
        `[${sent + failed}/${students.length}] ✓ Sent to ${student.email} | response: ${info.response}`
      );
    } catch (error) {
      failed++;
      student.emailError = error.message;
      await student.save();

      failedList.push({ email: student.email, error: error.message });
      logger.error(
        `[${sent + failed}/${students.length}] ✗ Failed for ${student.email}: ${error.message}`
      );
    }

    if (sent + failed < students.length) {
      await sleep(env.emailDelayMs);
    }
  }

  const summary = { total: students.length, sent, failed, failedList };
  logger.info(
    `Dispatch complete: ${sent} sent, ${failed} failed out of ${students.length}`
  );
  return summary;
};

module.exports = { sendCredentialEmail, sendAllPending, sendDiagnosticEmail };
