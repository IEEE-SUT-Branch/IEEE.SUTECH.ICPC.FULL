const { startTestServer, stopTestServer } = require("./setup");
const {
  setBaseURL,
  getAdminToken,
  getStudentToken,
  api,
} = require("./helpers");
const Student = require("../src/models/Student");
const Contest = require("../src/models/Contest");

let baseURL, adminToken, studentId;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);

  const student = await Student.create({
    fullName: "Monitor Test Student",
    universityId: "SUT300",
    email: "monitor@sut.edu.eg",
    labAssignment: "Lab 7",
    testGroup: "Wednesday",
  });
  studentId = student._id.toString();

  adminToken = await getAdminToken();
});

afterAll(async () => {
  await stopTestServer();
});

describe("Monitoring", () => {
  test("GET /api/monitor/overview", async () => {
    const res = await api(adminToken).get("/monitor/overview");
    expect(res.status).toBe(200);
    expect(res.data.data.totalStudents).toBeGreaterThan(0);
    expect(res.data.data.judgeQueue).toBeDefined();
  });

  test("GET /api/monitor/students", async () => {
    const res = await api(adminToken).get("/monitor/students");
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThan(0);
  });

  test("GET /api/monitor/students?lab=Lab 7", async () => {
    const res = await api(adminToken).get("/monitor/students?lab=Lab 7");
    expect(res.status).toBe(200);
    res.data.data.forEach((s) => {
      expect(s.labAssignment).toBe("Lab 7");
    });
  });

  test("GET /api/monitor/labs", async () => {
    const res = await api(adminToken).get("/monitor/labs");
    expect(res.status).toBe(200);
    expect(res.data.data["Lab 7"]).toBeDefined();
    expect(res.data.data["Lab 7"].total).toBeGreaterThan(0);
  });

  test("POST /api/monitor/warn/:studentId", async () => {
    const res = await api(adminToken).post(`/monitor/warn/${studentId}`, {
      message: "Stop looking around!",
    });
    expect(res.status).toBe(200);
    expect(res.data.warningCount).toBe(1);
  });

  test("POST /api/monitor/penalize/:studentId", async () => {
    const res = await api(adminToken).post(`/monitor/penalize/${studentId}`, {
      minutes: 5,
      reason: "Tab switching",
    });
    expect(res.status).toBe(200);
  });

  test("POST /api/monitor/disqualify/:studentId", async () => {
    const res = await api(adminToken).post(`/monitor/disqualify/${studentId}`, {
      reason: "Repeated violations",
    });
    expect(res.status).toBe(200);

    // Verify in DB
    const student = await Student.findById(studentId);
    expect(student.contestSession.isDisqualified).toBe(true);
  });

  test("Disqualified student cannot login", async () => {
    const res = await api("").post("/auth/student/login", {
      email: "monitor@sut.edu.eg",
      universityId: "SUT300",
    });
    expect(res.status).toBe(403);
    expect(res.data.message).toContain("disqualified");
  });
});
