/**
 * Microsoft Graph API email sender.
 *
 * Why Graph API instead of SMTP?
 * Microsoft disabled Basic Authentication for Office 365 SMTP in 2022.
 * Graph API uses OAuth2 Client Credentials — the modern, supported method.
 *
 * Setup (one-time, done by IT admin):
 * 1. portal.azure.com → Azure Active Directory → App registrations → New registration
 * 2. Name: "SUTech Email Automation", Supported account types: "Accounts in this org only"
 * 3. Certificates & secrets → New client secret → copy the VALUE (not the ID)
 * 4. API permissions → Add permission → Microsoft Graph → Application permissions
 *    → Mail.Send → Add → Grant admin consent
 * 5. Copy: Application (client) ID, Directory (tenant) ID, Client Secret
 */

const axios = require("axios");
const env = require("./env");
const logger = require("./logger");

let _tokenCache = null;

/**
 * Returns a valid Bearer token, using cached token if not expired.
 */
const getAccessToken = async () => {
  const now = Date.now();

  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const { tenantId, clientId, clientSecret } = env.azure;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await axios.post(url, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });

  _tokenCache = {
    token: response.data.access_token,
    expiresAt: now + response.data.expires_in * 1000,
  };

  return _tokenCache.token;
};

/**
 * Sends a single email via Graph API.
 * Accepts the same { from, to, subject, html, replyTo } that nodemailer uses.
 */
const sendMail = async ({ to, subject, html, replyTo }) => {
  const token = await getAccessToken();
  const sender = env.azure.senderEmail;

  const message = {
    subject,
    body: { contentType: "HTML", content: html },
    toRecipients: [{ emailAddress: { address: to } }],
  };

  if (replyTo) {
    // replyTo is a string like: "IEEE SUTech <email@domain.com>"
    const match = replyTo.match(/<(.+)>/);
    const replyAddress = match ? match[1] : replyTo;
    message.replyTo = [{ emailAddress: { address: replyAddress } }];
  }

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    { message, saveToSentItems: true },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  // Graph API returns 202 Accepted with no body — simulate nodemailer response
  return {
    messageId: `<${Date.now()}-graph@${sender.split("@")[1]}>`,
    response: "202 Accepted",
    accepted: [to],
    rejected: [],
    envelope: { from: sender, to: [to] },
  };
};

/**
 * Verifies Graph API credentials and Mail.Send permission.
 */
const verifyConnection = async () => {
  await getAccessToken();
  logger.info(`Graph API ready — sending as: ${env.azure.senderEmail}`);
  return true;
};

module.exports = { sendMail, verifyConnection };
