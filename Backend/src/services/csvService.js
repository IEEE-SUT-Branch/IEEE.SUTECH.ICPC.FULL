// src/services/csvService.js
const fs = require("fs");
const { Readable } = require("stream");
const csv = require("csv-parser");
const logger = require("../config/logger");

/**
 * Parses a CSV file and returns an array of student objects.
 * Accepts either a file path (string) or a Buffer (memory upload).
 *
 * Expected CSV columns (case-insensitive, flexible naming):
 *   fullName (or name, full_name)
 *   universityId (or id, university_id, student_id)
 *   email
 *   labAssignment (or lab, lab_assignment)
 *   testGroup (or group, test_group)
 */
const parseCSV = (filePathOrBuffer) => {
  return new Promise((resolve, reject) => {
    const students = [];
    const errors = [];

    // Support both disk path and in-memory buffer
    const stream = Buffer.isBuffer(filePathOrBuffer)
      ? Readable.from(filePathOrBuffer)
      : fs.createReadStream(filePathOrBuffer);

    stream
      .pipe(csv())
      .on("data", (row) => {
        // Normalize column names — handle different naming conventions
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
          normalized[
            key
              .trim()
              .toLowerCase()
              .replace(/[\s_-]+/g, "")
          ] = value.trim();
        }

        const student = {
          fullName:
            normalized.fullname ||
            normalized.name ||
            normalized.studentname ||
            null,
          universityId:
            normalized.universityid ||
            normalized.id ||
            normalized.studentid ||
            normalized.uid ||
            null,
          email: normalized.email || normalized.studentemail || null,
          labAssignment: normalized.labassignment || normalized.lab || null,
          testGroup: normalized.testgroup || normalized.group || null,
        };

        // Basic validation
        if (!student.fullName || !student.universityId || !student.email) {
          errors.push({
            row: students.length + errors.length + 1,
            data: row,
            reason: "Missing required field (fullName, universityId, or email)",
          });
          return;
        }

        students.push(student);
      })
      .on("end", () => {
        // Clean up temp file if it was a disk upload
        if (!Buffer.isBuffer(filePathOrBuffer)) {
          fs.unlink(filePathOrBuffer, (err) => {
            if (err) logger.warn("Could not delete temp CSV file:", err.message);
          });
        }

        logger.info(
          `CSV parsed: ${students.length} valid, ${errors.length} errors`
        );
        resolve({ students, errors });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

module.exports = { parseCSV };
