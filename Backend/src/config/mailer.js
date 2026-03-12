const nodemailer = require("nodemailer");
const env = require("./env");
const logger = require("./logger");

// ═══ Priority: Power Automate > Graph API > SMTP ═══
const usePowerAutomate = Boolean(env.powerAutomate.webhookUrl);

const useGraph =
  !usePowerAutomate &&
  Boolean(env.azure.tenantId) &&
  Boolean(env.azure.clientId) &&
  Boolean(env.azure.clientSecret) &&
  Boolean(env.azure.senderEmail);

if (usePowerAutomate) {
  logger.info("Email backend: Power Automate (Office 365 via webhook)");
} else if (useGraph) {
  logger.info("Email backend: Microsoft Graph API (OAuth2)");
} else {
  logger.info(`Email backend: SMTP (${env.smtp.host})`);
}

// ─── SMTP transporter (fallback) ────────────────────────────────────────────
const _smtpTransporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 30000,
});

// ─── Unified transporter (same { sendMail } interface across all backends) ──
let transporter;

// EMAIL_DISABLED=true → no-op (no emails leave the server)
if (process.env.EMAIL_DISABLED === "true") {
  logger.warn("⚠️  Email sending DISABLED (EMAIL_DISABLED=true). No emails will be sent.");
  transporter = {
    sendMail: async (opts) => {
      logger.warn(`[EMAIL DISABLED] Skipped send to: ${opts.to}`);
      return { messageId: "disabled", response: "disabled", accepted: [opts.to], rejected: [] };
    },
  };
} else if (usePowerAutomate) {
  transporter = require("./powerAutomateMailer");
} else if (useGraph) {
  transporter = require("./graphMailer");
} else {
  transporter = _smtpTransporter;
}

// ─── Debug transporter (SMTP only — used by /api/emails/test) ───────────────
const createDebugTransporter = () => {
  const debugLogs = [];

  const debugTransporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
    logger: {
      debug: (msg) =>
        debugLogs.push({ level: "debug", msg: msg.message || msg }),
      info: (msg) => debugLogs.push({ level: "info", msg: msg.message || msg }),
      warn: (msg) => debugLogs.push({ level: "warn", msg: msg.message || msg }),
      error: (msg) =>
        debugLogs.push({ level: "error", msg: msg.message || msg }),
    },
    debug: true,
  });

  return { debugTransporter, debugLogs };
};

// ─── Connection verification ─────────────────────────────────────────────────
const verifyConnection = async () => {
  try {
    if (usePowerAutomate) {
      return await require("./powerAutomateMailer").verifyConnection();
    }
    if (useGraph) {
      return await require("./graphMailer").verifyConnection();
    }

    await _smtpTransporter.verify();
    logger.info("SMTP connection verified — ready to send emails");

    if (env.smtp.fromEmail !== env.smtp.user) {
      logger.warn("SMTP_FROM_EMAIL differs from SMTP_USER");
      logger.warn(`  Actual sender: ${env.smtp.user}`);
      logger.warn(`  Reply-To:      ${env.smtp.fromEmail}`);
    }

    return true;
  } catch (error) {
    logger.error("Email verification failed:", error.message);
    return false;
  }
};

module.exports = { transporter, createDebugTransporter, verifyConnection };
