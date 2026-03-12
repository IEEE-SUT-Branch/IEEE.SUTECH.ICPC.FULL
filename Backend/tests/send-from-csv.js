/**
 * send-from-csv.js
 * Standalone script: reads students.csv and sends placement test emails.
 * Run: node send-from-csv.js [path/to/file.csv]
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const csv = require("csv-parser");
const nodemailer = require("nodemailer");
const Handlebars = require("handlebars");

// ─── Config from .env ────────────────────────────────────────────────────────
const CSV_PATH = process.argv[2] || path.join(__dirname, "students.csv");

const SMTP = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
};

const FROM_NAME  = process.env.SMTP_FROM_NAME  || "IEEE SUTech";
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP.user;
const BASE_URL   = process.env.BASE_URL        || "http://localhost:3000";
const DELAY_MS   = parseInt(process.env.EMAIL_DELAY_MS, 10) || 3000;

const POWER_AUTOMATE_URL = process.env.POWER_AUTOMATE_WEBHOOK_URL || null;

// ─── Validate required vars ───────────────────────────────────────────────────
if (!POWER_AUTOMATE_URL && (!SMTP.host || !SMTP.user || !SMTP.pass)) {
  console.error("❌  Missing SMTP config in .env (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  process.exit(1);
}

// ─── Transporter ─────────────────────────────────────────────────────────────
let transporter;

if (POWER_AUTOMATE_URL) {
  // Power Automate: wrap in nodemailer-compatible interface
  const axios = require("axios");
  transporter = {
    sendMail: async (opts) => {
      const res = await axios.post(POWER_AUTOMATE_URL, {
        to:      opts.to,
        subject: opts.subject,
        html:    opts.html,
      });
      return { messageId: res.headers["x-ms-workflow-run-id"] || "pa-sent", response: `${res.status} ${res.statusText}`, accepted: [opts.to], rejected: [] };
    },
  };
  console.log("📨  Backend: Power Automate");
} else {
  transporter = nodemailer.createTransport({
    host:    SMTP.host,
    port:    SMTP.port,
    secure:  SMTP.secure,
    auth:    { user: SMTP.user, pass: SMTP.pass },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     30000,
  });
  console.log(`📨  Backend: SMTP (${SMTP.host})`);
}

// ─── Template ─────────────────────────────────────────────────────────────────
Handlebars.registerHelper("currentYear", () => new Date().getFullYear());

const TEMPLATE_PATH = path.join(__dirname, "src/templates/placementTest.hbs");
if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(`❌  Template not found: ${TEMPLATE_PATH}`);
  process.exit(1);
}
const template = Handlebars.compile(fs.readFileSync(TEMPLATE_PATH, "utf8"));

// ─── Build context for one student ───────────────────────────────────────────
const buildContext = (student) => ({
  studentName:        student.fullName,
  loginUsername:      student.email,
  labAssignment:      student.labAssignment,
  testGroup:          student.testGroup,
  testDate:
    student.testGroup === "Group1" ? "Thursday, March 12, 2026" :
    student.testGroup === "Group2" ? "Thursday, March 19, 2026" :
                                     "Thursday, March 12, 2026",
  testDuration:       "60 minutes",
  problemCount:       5,
  supportedLanguages: "C++, Python, Java",
  platformUrl:        "https://ieee.reca-tech.com",
  supportEmail:       FROM_EMAIL,
  logoUrl:            `${BASE_URL}/logo1.png`,
  currentYear:        new Date().getFullYear(),
});

// ─── Parse CSV ────────────────────────────────────────────────────────────────
const parseCSV = (filePath) =>
  new Promise((resolve, reject) => {
    const students = [];
    const errors   = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const n = {};
        for (const [k, v] of Object.entries(row)) {
          n[k.trim().toLowerCase().replace(/[\s_-]+/g, "")] = v.trim();
        }

        const s = {
          fullName:      n.fullname || n.name || n.studentname || null,
          universityId:  n.universityid || n.id || n.studentid || n.uid || null,
          email:         n.email || n.studentemail || null,
          labAssignment: n.labassignment || n.lab || null,
          testGroup:     n.testgroup || n.group || null,
        };

        if (!s.fullName || !s.universityId || !s.email) {
          errors.push({ row: students.length + errors.length + 1, data: row });
          return;
        }
        students.push(s);
      })
      .on("end",   () => resolve({ students, errors }))
      .on("error", reject);
  });

// ─── Send one email ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sendOne = async (student) => {
  const html = template(buildContext(student));
  const info = await transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to:      student.email,
    subject: "ECPC Placement Test (Stage 1) — Your Schedule & Login Details",
    html,
    replyTo: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    headers: {
      "X-Mailer":   "SUTech-Email-Automation",
      "X-Priority": "3",
      Precedence:   "bulk",
    },
  });
  return info;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n📂  Reading: ${CSV_PATH}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌  File not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const { students, errors } = await parseCSV(CSV_PATH);

  if (errors.length) {
    console.warn(`⚠️   Skipped ${errors.length} invalid row(s):`);
    errors.forEach((e) => console.warn(`    Row ${e.row}:`, e.data));
  }

  if (students.length === 0) {
    console.error("❌  No valid students found in CSV.");
    process.exit(1);
  }

  console.log(`✅  Found ${students.length} student(s). Starting dispatch...\n`);

  let sent = 0, failed = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    process.stdout.write(`[${i + 1}/${students.length}] Sending to ${s.email} ... `);

    try {
      const info = await sendOne(s);
      sent++;
      console.log(`✓  ${info.response || "sent"}`);
    } catch (err) {
      failed++;
      console.log(`✗  FAILED: ${err.message}`);
    }

    // Delay between sends (skip after last)
    if (i < students.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅  Sent:   ${sent}`);
  if (failed) console.log(`❌  Failed: ${failed}`);
  console.log(`─────────────────────────────────\n`);
})();
