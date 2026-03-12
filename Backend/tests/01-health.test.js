const { startTestServer, stopTestServer } = require("./setup");
const { setBaseURL, emailApi } = require("./helpers");
const axios = require("axios");

let baseURL;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);
});

afterAll(async () => {
  await stopTestServer();
});

describe("Health Check", () => {
  test("GET /api/health returns 200", async () => {
    const res = await axios.get(`${baseURL}/api/health`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toContain("running");
  });
});
