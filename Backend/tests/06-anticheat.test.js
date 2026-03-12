const { startTestServer, stopTestServer } = require("./setup");
const {
  setBaseURL,
  getAdminToken,
  getStudentToken,
  api,
} = require("./helpers");
const Student = require("../src/models/Student");

let baseURL, adminToken, studentToken;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);

  await Student.create({
    fullName: "Cheat Test Student",
    universityId: "SUT400",
    email: "cheat@sut.edu.eg",
    labAssignment: "Lab 5",
    testGroup: "Sunday",
  });

  adminToken = await getAdminToken();
  studentToken = await getStudentToken("cheat@sut.edu.eg", "SUT400");
});

afterAll(async () => {
  await stopTestServer();
});

describe("Anti-Cheat", () => {
  let logId;

  test("Student reports tab switch", async () => {
    const res = await api(studentToken).post("/anticheat/event", {
      eventType: "tab_switch",
      details: "Switched to Google Chrome",
    });
    expect(res.status).toBe(200);
  });

  test("Student reports fullscreen exit", async () => {
    const res = await api(studentToken).post("/anticheat/event", {
      eventType: "fullscreen_exit",
      details: "Pressed Escape",
    });
    expect(res.status).toBe(200);
  });

  test("Student reports paste attempt", async () => {
    const res = await api(studentToken).post("/anticheat/event", {
      eventType: "paste_attempt",
      details: "Pasted 200 characters",
    });
    expect(res.status).toBe(200);
  });

  test("Missing eventType — 400", async () => {
    const res = await api(studentToken).post("/anticheat/event", {
      details: "no type",
    });
    expect(res.status).toBe(400);
  });

  test("Admin gets all logs", async () => {
    const res = await api(adminToken).get("/anticheat/logs");
    expect(res.status).toBe(200);
    expect(res.data.count).toBe(3);
    logId = res.data.data[0]._id;
  });

  test("Admin filters by eventType", async () => {
    const res = await api(adminToken).get(
      "/anticheat/logs?eventType=tab_switch"
    );
    expect(res.status).toBe(200);
    res.data.data.forEach((log) => {
      expect(log.eventType).toBe("tab_switch");
    });
  });

  test("Admin acknowledges alert", async () => {
    const res = await api(adminToken).patch(
      `/anticheat/logs/${logId}/acknowledge`
    );
    expect(res.status).toBe(200);
    expect(res.data.data.acknowledged).toBe(true);
  });
});
