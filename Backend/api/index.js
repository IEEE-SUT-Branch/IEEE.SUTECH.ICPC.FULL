const app = require("../src/app");

// Vercel serverless — no http.createServer, no Socket.io
// All real-time features degrade to polling automatically
// Judge uses Wandbox/JDoodle (no local runtimes available)

module.exports = app;
