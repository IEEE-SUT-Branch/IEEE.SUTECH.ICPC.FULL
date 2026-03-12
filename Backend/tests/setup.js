require("dotenv").config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("../src/app");
const { initSocket } = require("../src/socket");
const bcrypt = require("bcryptjs");

let server;
let baseURL;

async function startTestServer() {
  try {
    // Disconnect if already connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const uri = process.env.MONGO_URI;
    console.log(
      "Connecting to MongoDB:",
      uri ? uri.substring(0, 30) + "..." : "MISSING"
    );

    await mongoose.connect(uri);
    console.log("MongoDB connected");

    // Clean all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Seed admin (low bcrypt rounds for speed)
    const Admin = require("../src/models/Admin");
    const hash = await bcrypt.hash("testpass123", 4);
    await Admin.create({
      username: "testadmin",
      passwordHash: hash,
      fullName: "Test Admin",
      role: "admin",
    });
    console.log("Admin seeded");

    server = http.createServer(app);
    initSocket(server);

    return new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseURL = `http://localhost:${port}`;
        console.log(`Test server started on ${baseURL}`);
        resolve({ server, baseURL });
      });
    });
  } catch (err) {
    console.error("startTestServer FAILED:", err.message);
    throw err;
  }
}

async function stopTestServer() {
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error("stopTestServer error:", err.message);
  }
}

async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = { startTestServer, stopTestServer, clearDB };
