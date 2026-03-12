const Student = require("../models/Student");
const env = require("../config/env");
const logger = require("../config/logger");

/**
 * Assigns lab passwords to all students based on their lab assignment.
 * Students in the same lab get the same password.
 * Call this after CSV import.
 */
const assignLabPasswords = async () => {
  const labs = ["Lab 5", "Lab 6", "Lab 7"];
  let totalUpdated = 0;

  for (const lab of labs) {
    const password = env.labPasswords[lab];
    const result = await Student.updateMany(
      { labAssignment: lab, labPassword: null },
      { $set: { labPassword: password } }
    );
    totalUpdated += result.modifiedCount;

    if (result.modifiedCount > 0) {
      logger.info(
        `Assigned password to ${result.modifiedCount} students in ${lab}`
      );
    }
  }

  return totalUpdated;
};

/**
 * Returns a summary of passwords per lab (for the admin/proctor).
 * This is what you print and give to the lab proctor on test day.
 */
const getLabPasswordSummary = async () => {
  const summary = [];

  for (const [lab, password] of Object.entries(env.labPasswords)) {
    const count = await Student.countDocuments({ labAssignment: lab });
    summary.push({ lab, password, studentCount: count });
  }

  return summary;
};

module.exports = { assignLabPasswords, getLabPasswordSummary };
