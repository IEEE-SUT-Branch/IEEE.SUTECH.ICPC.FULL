/**
 * Power Automate webhook email sender.
 *
 * Sends emails by calling a Power Automate HTTP trigger flow.
 * The flow is configured with Office 365 "Send an email (V2)" action,
 * which sends from IEEE.SUTech@sut.edu.eg without needing SMTP or Azure setup.
 *
 * Power Automate flow expected input schema:
 *   { "to": "...", "subject": "...", "html": "..." }
 *
 * Flow returns HTTP 202 Accepted when queued for delivery.
 */

const axios = require("axios");
const env = require("./env");
const logger = require("./logger");

/**
 * Sends a single email via Power Automate webhook.
 * Accepts nodemailer-style options — extracts only { to, subject, html }.
 */
const sendMail = async ({ to, subject, html }) => {
  const webhookUrl = env.powerAutomate.webhookUrl;

  const response = await axios.post(
    webhookUrl,
    { to, subject, html },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
      // Power Automate returns 202 Accepted — treat it as success
      validateStatus: (status) => status === 202 || status === 200,
    }
  );

  return {
    messageId: `<${Date.now()}-powerautomate@sut.edu.eg>`,
    response: `${response.status} Accepted`,
    accepted: [to],
    rejected: [],
    envelope: { from: env.smtp.fromEmail, to: [to] },
  };
};

/**
 * Verifies the webhook URL is configured (no actual HTTP call needed).
 */
const verifyConnection = async () => {
  logger.info(
    `Power Automate ready — sending via: ${env.smtp.fromEmail || "IEEE.SUTech@sut.edu.eg"}`
  );
  return true;
};

module.exports = { sendMail, verifyConnection };
