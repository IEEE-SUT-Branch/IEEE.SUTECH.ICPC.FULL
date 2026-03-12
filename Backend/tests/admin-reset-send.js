/**
 * admin-reset-send.js
 * 1. Clears all students from MongoDB
 * 2. Imports students from students.csv
 * 3. Sends the placement test email to each one
 *
 * Run: node admin-reset-send.js [path/to/file.csv]
 */

require("dotenv").config();
const path    = require("path");
const fs      = require("fs");
const csv     = require("csv-parser");
const mongoose = require("mongoose");

const CSV_PATH = process.argv[2] || path.join(__dirname, "students.csv");

// ─── Bootstrap (reuse existing services) ─────────────────────────────────────
// env.js validates & exports all config from .env
const env             = require("../src/config/env");
const Student         = require("../src/models/Student");
const { sendCredentialEmail } = require("../src/services/emailService");

// ─── Parse CSV ────────────────────────────────────────────────────────────────
const parseCSV = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    const bad  = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        // normalise header keys
        const n = {};
        for (const [k, v] of Object.entries(row))
          n[k.trim().toLowerCase().replace(/[\s_-]+/g, "")] = v.trim();

        const s = {
          fullName:      n.fullname      || n.name          || null,
          universityId:  n.universityid  || n.id            || null,
          email:         n.email         || n.studentemail  || null,
          labAssignment: n.labassignment || n.lab           || null,
          testGroup:     n.testgroup     || n.group         || null,
        };

        if (!s.fullName || !s.universityId || !s.email || !s.labAssignment || !s.testGroup) {
          bad.push(row);
        } else {
          rows.push(s);
        }
      })
      .on("end",   () => resolve({ rows, bad }))
      .on("error", reject);
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  // ── 1. Connect to MongoDB ──────────────────────────────────────────────────
  console.log("\n🔌  Connecting to MongoDB...");
  await mongoose.connect(env.mongo.uri);
  console.log("✅  Connected.\n");

  // ── 2. Clear all students ──────────────────────────────────────────────────
  const { deletedCount } = await Student.deleteMany({});
  console.log(`🗑️   Cleared ${deletedCount} existing student(s) from the database.\n`);

  // ── 3. Parse CSV ───────────────────────────────────────────────────────────
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌  CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`📂  Reading: ${CSV_PATH}`);
  const { rows, bad } = await parseCSV(CSV_PATH);

  if (bad.length)
    bad.forEach((r, i) => console.warn(`⚠️   Skipped invalid row ${i + 1}:`, r));

  if (rows.length === 0) {
    console.error("❌  No valid students found in CSV.");
    process.exit(1);
  }

  // ── 4. Insert students ─────────────────────────────────────────────────────
  const inserted = await Student.insertMany(rows, { ordered: false });
  console.log(`➕  Added ${inserted.length} student(s) to the database.\n`);

  // ── 5. Send emails ─────────────────────────────────────────────────────────
  console.log(`📨  Sending ${inserted.length} email(s)...\n`);

  let sent = 0, failed = 0;

  for (let i = 0; i < inserted.length; i++) {
    const student = inserted[i];
    process.stdout.write(`[${i + 1}/${inserted.length}] → ${student.email} ... `);

    try {
      const info = await sendCredentialEmail(student);

      await Student.updateOne(
        { _id: student._id },
        { emailSent: true, emailSentAt: new Date(), emailError: null }
      );

      sent++;
      console.log(`✓  ${info.response || "sent"}`);
    } catch (err) {
      failed++;
      await Student.updateOne(
        { _id: student._id },
        { emailError: err.message }
      );
      console.log(`✗  FAILED: ${err.message}`);
    }

    if (i < inserted.length - 1) await sleep(env.emailDelayMs || 3000);
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────");
  console.log(`✅  Sent:   ${sent}`);
  if (failed) console.log(`❌  Failed: ${failed}`);
  console.log("─────────────────────────────────\n");

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
