const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

// Student schema (minimal match)
const studentSchema = new mongoose.Schema({
  fullName:      { type: String, required: true, trim: true },
  universityId:  { type: String, required: true, unique: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  labAssignment: { type: String, required: true },
  testGroup:     { type: String, required: true },
  labPassword:   { type: String, default: null },
  emailSent:     { type: Boolean, default: false },
  emailSentAt:   { type: Date, default: null },
  emailError:    { type: String, default: null },
  contestSession: {
    bonusTimeSeconds:    { type: Number, default: 0 },
    isDisqualified:      { type: Boolean, default: false },
    disqualifiedAt:      { type: Date, default: null },
    disqualifiedReason:  { type: String, default: null },
    warningCount:        { type: Number, default: 0 },
    penaltyMinutesAdded: { type: Number, default: 0 },
  },
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  const csvPath = path.join(__dirname, 'students.csv');
  const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(l => l.trim());

  // Skip header
  const rows = lines.slice(1);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const cols = row.split(',');
    if (cols.length < 5) continue;

    const fullName     = cols[0].trim();
    const universityId = cols[1].trim();
    const email        = cols[2].trim().toLowerCase();
    const labAssignment = cols[3].trim();
    const testGroup    = cols[4].trim();

    if (!fullName || !universityId || !email) {
      console.log(`  SKIP (missing data): ${row}`);
      skipped++;
      continue;
    }

    try {
      await Student.updateOne(
        { universityId },
        { $setOnInsert: { fullName, universityId, email, labAssignment, testGroup } },
        { upsert: true }
      );
      console.log(`  OK: ${fullName} (${universityId})`);
      inserted++;
    } catch (err) {
      console.log(`  ERR: ${fullName} (${universityId}) — ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted/Updated: ${inserted}`);
  console.log(`Skipped:          ${skipped}`);
  console.log(`Errors:           ${errors}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
