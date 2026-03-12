const { createLogger, format, transports } = require("winston");
const path = require("path");

const isServerless = !!(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

const transportsList = [
  // Always log to console
  new transports.Console({
    format: format.combine(format.colorize(), format.simple()),
  }),
];

// Only add file transports when NOT on serverless (filesystem is read-only)
if (!isServerless) {
  transportsList.push(
    new transports.File({
      filename: path.join(__dirname, "../../logs/error.log"),
      level: "error",
    }),
    new transports.File({
      filename: path.join(__dirname, "../../logs/combined.log"),
    })
  );
}

const logger = createLogger({
  level: "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: transportsList,
});

module.exports = logger;
