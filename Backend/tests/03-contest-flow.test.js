const { startTestServer, stopTestServer } = require("./setup");
const {
  setBaseURL,
  getAdminToken,
  getStudentToken,
  api,
} = require("./helpers");
const Student = require("../src/models/Student");

let baseURL, adminToken, studentToken;
let contestId, problemId;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);

  // Seed student
  await Student.create({
    fullName: "Contest Student",
    universityId: "SUT100",
    email: "contest@sut.edu.eg",
    labAssignment: "Lab 5",
    testGroup: "Sunday",
  });

  adminToken = await getAdminToken();
  studentToken = await getStudentToken("contest@sut.edu.eg", "SUT100");
});

afterAll(async () => {
  await stopTestServer();
});

describe("Contest Lifecycle", () => {
  test("1. Create contest", async () => {
    const res = await api(adminToken).post("/contests", {
      title: "Test Placement",
      durationMinutes: 60,
      type: "placement",
    });
    expect(res.status).toBe(201);
    expect(res.data.data.status).toBe("not_started");
    contestId = res.data.data._id;
  });

  test("2. Create problem", async () => {
    const res = await api(adminToken).post("/problems", {
      contestId,
      letter: "A",
      title: "A + B",
      description: "Print the sum of two numbers",
      inputDescription: "Two integers",
      outputDescription: "Their sum",
      timeLimitSeconds: 2,
      difficulty: "easy",
      order: 1,
      testCases: [
        { input: "1 2", expectedOutput: "3", isVisible: true },
        { input: "10 20", expectedOutput: "30", isVisible: true },
        { input: "999 1", expectedOutput: "1000", isVisible: false },
      ],
    });
    expect(res.status).toBe(201);
    problemId = res.data.data._id;
  });

  test("3. Publish problem", async () => {
    const res = await api(adminToken).patch(`/problems/${problemId}/publish`);
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("published");
  });

  test("4. Student cannot submit before contest starts", async () => {
    const res = await api(studentToken).post("/submissions", {
      problemId,
      code: "print('hello')",
      language: "python",
    });
    expect(res.status).toBe(403);
    expect(res.data.message).toContain("No contest");
  });

  test("5. Start contest", async () => {
    const res = await api(adminToken).post(`/contests/${contestId}/start`);
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("running");
    expect(res.data.data.startedAt).toBeDefined();
  });

  test("6. Get active contest", async () => {
    const res = await api(studentToken).get("/contests/active");
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("running");
  });

  test("7. Student sees published problems (hidden TCs stripped)", async () => {
    const res = await api(studentToken).get("/problems/contest");
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBe(1);
    expect(res.data.data[0].letter).toBe("A");
    // Only visible test cases
    expect(res.data.data[0].testCases.length).toBe(2);
    res.data.data[0].testCases.forEach((tc) => {
      expect(tc.isVisible).toBe(true);
    });
  });

  test("8. Get timer", async () => {
    const res = await api(studentToken).get(`/contests/${contestId}/timer`);
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("running");
    expect(res.data.data.remainingMs).toBeGreaterThan(0);
  });

  test("9. Run code against samples", async () => {
    const res = await api(studentToken).post("/submissions/run", {
      problemId,
      code: "a, b = map(int, input().split())\nprint(a + b)",
      language: "python",
    });
    expect(res.status).toBe(200);
    expect(res.data.data.compilationError).toBeNull();
    expect(res.data.data.results.length).toBe(2); // only visible
    res.data.data.results.forEach((r) => {
      expect(r.passed).toBe(true);
    });
  });

  test("10. Submit correct solution (AC)", async () => {
    const res = await api(studentToken).post("/submissions", {
      problemId,
      code: "a, b = map(int, input().split())\nprint(a + b)",
      language: "python",
    });
    expect(res.status).toBe(202);
    expect(res.data.data.verdict).toBe("queued");

    // Wait for judging
    await new Promise((r) => setTimeout(r, 8000));

    // Check verdict
    const subs = await api(studentToken).get("/submissions/my");
    expect(subs.data.data.length).toBeGreaterThan(0);
    expect(subs.data.data[0].verdict).toBe("AC");
    expect(subs.data.data[0].isAccepted).toBe(true);
  }, 15000);

  test("11. Submit wrong solution (WA)", async () => {
    // Wait for rate limiter
    await new Promise((r) => setTimeout(r, 10000));

    const res = await api(studentToken).post("/submissions", {
      problemId,
      code: "print(42)",
      language: "python",
    });
    expect(res.status).toBe(202);

    await new Promise((r) => setTimeout(r, 8000));

    const subs = await api(studentToken).get("/submissions/my");
    const latest = subs.data.data[0]; // sorted by submittedAt desc
    expect(latest.verdict).toBe("WA");
  }, 25000);

  test("12. Standings reflect results", async () => {
    const res = await api(adminToken).get("/standings");
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThan(0);

    const student = res.data.data.find((s) => s.fullName === "Contest Student");
    expect(student).toBeDefined();
    expect(student.totalSolved).toBe(1);
    expect(student.problems.A.solved).toBe(true);
    expect(student.problems.A.attempts).toBe(0); // WA came after AC, should be ignored
  });

  test("13. Pause contest", async () => {
    const res = await api(adminToken).post(`/contests/${contestId}/pause`);
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("paused");
  });

  test("14. Cannot submit when paused", async () => {
    await new Promise((r) => setTimeout(r, 10000));
    const res = await api(studentToken).post("/submissions", {
      problemId,
      code: "print(1)",
      language: "python",
    });
    expect(res.status).toBe(403);
  }, 15000);

  test("15. Resume contest", async () => {
    const res = await api(adminToken).post(`/contests/${contestId}/resume`);
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("running");
    expect(res.data.data.totalPausedMs).toBeGreaterThan(0);
  });

  test("16. End contest", async () => {
    const res = await api(adminToken).post(`/contests/${contestId}/end`);
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("ended");
  });

  test("17. Export standings CSV", async () => {
    const res = await api(adminToken).get("/standings/export");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.data).toContain("Rank,Name");
    expect(res.data).toContain("Contest Student");
  });
});
