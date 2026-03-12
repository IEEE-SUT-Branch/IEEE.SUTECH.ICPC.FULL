const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const Student = require("../src/models/Student");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const doc = await Student.findOneAndUpdate(
    { email: "demo.student@sut.edu.eg" },
    {
      fullName: "Demo Student",
      universityId: "DEMO2026",
      email: "demo.student@sut.edu.eg",
      labAssignment: "Lab 6",
      testGroup: "Group1",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const total = await Student.countDocuments();
  console.log(`demo_student_id=${doc._id}`);
  console.log(`total_students=${total}`);

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
