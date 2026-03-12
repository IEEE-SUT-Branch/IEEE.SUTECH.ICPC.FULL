const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  baseUrl: process.env.BASE_URL || `http://localhost:${parseInt(process.env.PORT, 10) || 3000}`,

  mongo: {
    uri: process.env.MONGO_URI,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || "IEEE SUTech",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
  },

  adminApiKey: process.env.ADMIN_API_KEY,
  emailDelayMs: parseInt(process.env.EMAIL_DELAY_MS, 10) || 3000,

  labPasswords: {
    "Lab 5": process.env.LAB5_PASSWORD || "ECPC-L5-2026",
    "Lab 6": process.env.LAB6_PASSWORD || "ECPC-L6-2026",
    "Lab 7": process.env.LAB7_PASSWORD || "ECPC-L7-2026",
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "2h",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  },

  azure: {
    tenantId: process.env.AZURE_TENANT_ID || null,
    clientId: process.env.AZURE_CLIENT_ID || null,
    clientSecret: process.env.AZURE_CLIENT_SECRET || null,
    senderEmail: process.env.AZURE_SENDER_EMAIL || null,
  },

  powerAutomate: {
    webhookUrl: process.env.POWER_AUTOMATE_WEBHOOK_URL || null,
  },

  piston: {
    url: process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston",
  },

  jdoodle: {
    clientId: process.env.JDOODLE_CLIENT_ID || null,
    clientSecret: process.env.JDOODLE_CLIENT_SECRET || null,
  },

  judge: {
    concurrency: Math.max(1, parseInt(process.env.JUDGE_CONCURRENCY || "3", 10)),
    compareMode: (process.env.JUDGE_COMPARE_MODE || "token").toLowerCase(),
    compileTimeoutMs: Math.max(
      5000,
      parseInt(process.env.JUDGE_COMPILE_TIMEOUT_MS || "20000", 10)
    ),
    maxOutputChars: Math.max(
      50000,
      parseInt(process.env.JUDGE_MAX_OUTPUT_CHARS || "200000", 10)
    ),
    maxStderrChars: Math.max(
      2000,
      parseInt(process.env.JUDGE_MAX_STDERR_CHARS || "10000", 10)
    ),
    maxCodeChars: Math.max(
      50000,
      parseInt(process.env.JUDGE_MAX_CODE_CHARS || "200000", 10)
    ),
  },

  corsOrigin: process.env.CORS_ORIGIN || "*",

  initialAdmin: {
    username: process.env.INITIAL_ADMIN_USERNAME || "admin",
    password: process.env.INITIAL_ADMIN_PASSWORD || "admin123",
  },
};

// ═══ CHANGED: Validate without process.exit() ═══
// Critical vars (app won't work without these)
const critical = ["mongo.uri", "jwt.accessSecret", "jwt.refreshSecret"];

// Optional vars (warn but don't crash)
const optional = ["smtp.host", "smtp.user", "smtp.pass", "adminApiKey"];

const missing = [];

for (const key of critical) {
  const value = key.split(".").reduce((obj, k) => obj?.[k], env);
  if (!value) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  // In serverless, we throw instead of process.exit
  const msg = `Missing CRITICAL env variables: ${missing.join(", ")}`;
  if (process.env.NODE_ENV === "test") {
    // Tests set these via .env — don't crash during module load
    console.warn(`⚠️  ${msg}`);
  } else {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
}

for (const key of optional) {
  const value = key.split(".").reduce((obj, k) => obj?.[k], env);
  if (!value) {
    console.warn(
      `⚠️  Missing optional env: ${key} — related features will be disabled`
    );
  }
}

module.exports = env;
