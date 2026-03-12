const path = require("path");
const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const Student = require("../src/models/Student");

const CSV_PATH = process.argv[2] || path.join(__dirname, "students.csv");

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const n = {};
        for (const [k, v] of Object.entries(row)) {
          n[k.trim().toLowerCase().replace(/[\s_-]+/g, "")] = String(v || "").trim();
        }

        const student = {
          fullName: n.fullname || n.name || "",
          universityId: n.universityid || n.id || "",
          email: (n.email || n.studentemail || "").toLowerCase(),
          labAssignment: n.labassignment || n.lab || "",
          testGroup: n.testgroup || n.group || "",
        };

        if (
          student.fullName &&
          student.universityId &&
          student.email &&
          student.labAssignment &&
          student.testGroup
        ) {
          rows.push(student);
        }
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

(async () => {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found: ${CSV_PATH}`);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const students = await parseCSV(CSV_PATH);
  if (students.length === 0) {
    throw new Error("No valid students found in CSV");
  }

  await Student.deleteMany({ email: { $ne: "demo.student@sut.edu.eg" } });
  const inserted = await Student.insertMany(students, { ordered: false });

  const total = await Student.countDocuments();
  console.log(`imported_students=${inserted.length}`);
  console.log(`total_students=${total}`);

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
