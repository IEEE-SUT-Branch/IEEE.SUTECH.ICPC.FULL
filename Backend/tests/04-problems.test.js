const { startTestServer, stopTestServer } = require("./setup");
const {
  setBaseURL,
  getAdminToken,
  getStudentToken,
  api,
} = require("./helpers");
const Student = require("../src/models/Student");
const Contest = require("../src/models/Contest");

let baseURL, adminToken, studentToken;
let contestId, problemId, testCaseId;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);

  await Student.create({
    fullName: "Problem Test Student",
    universityId: "SUT200",
    email: "prob@sut.edu.eg",
    labAssignment: "Lab 6",
    testGroup: "Wednesday",
  });

  adminToken = await getAdminToken();
  studentToken = await getStudentToken("prob@sut.edu.eg", "SUT200");

  // Create contest
  const contest = await Contest.create({
    title: "Problem Test Contest",
    durationMinutes: 60,
  });
  contestId = contest._id.toString();
});

afterAll(async () => {
  await stopTestServer();
});

describe("Problem CRUD", () => {
  test("Create problem", async () => {
    const res = await api(adminToken).post("/problems", {
      contestId,
      letter: "B",
      title: "Multiply",
      description: "Multiply two numbers",
      timeLimitSeconds: 1,
      difficulty: "easy",
      order: 2,
    });
    expect(res.status).toBe(201);
    problemId = res.data.data._id;
  });

  test("Create problem — missing fields", async () => {
    const res = await api(adminToken).post("/problems", {
      title: "No Contest",
    });
    expect(res.status).toBe(400);
  });

  test("List problems", async () => {
    const res = await api(adminToken).get(`/problems?contestId=${contestId}`);
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test("Get problem by ID", async () => {
    const res = await api(adminToken).get(`/problems/${problemId}`);
    expect(res.status).toBe(200);
    expect(res.data.data.letter).toBe("B");
  });

  test("Update problem", async () => {
    const res = await api(adminToken).put(`/problems/${problemId}`, {
      title: "Multiply Two Numbers",
      difficulty: "medium",
    });
    expect(res.status).toBe(200);
    expect(res.data.data.title).toBe("Multiply Two Numbers");
    expect(res.data.data.difficulty).toBe("medium");
  });

  test("Add test case", async () => {
    const res = await api(adminToken).post(
      `/problems/${problemId}/test-cases`,
      {
        input: "3 4\n",
        expectedOutput: "12\n",
        isVisible: true,
      }
    );
    expect(res.status).toBe(201);
    expect(res.data.data.testCases.length).toBe(1);
    testCaseId = res.data.data.testCases[0]._id;
  });

  test("Update test case", async () => {
    const res = await api(adminToken).put(
      `/problems/${problemId}/test-cases/${testCaseId}`,
      { isVisible: false }
    );
    expect(res.status).toBe(200);
    expect(res.data.data.testCases[0].isVisible).toBe(false);
  });

  test("Delete test case", async () => {
    const res = await api(adminToken).delete(
      `/problems/${problemId}/test-cases/${testCaseId}`
    );
    expect(res.status).toBe(200);
    expect(res.data.data.testCases.length).toBe(0);
  });

  test("Publish problem", async () => {
    const res = await api(adminToken).patch(`/problems/${problemId}/publish`);
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("published");
  });

  test("Student cannot create problems", async () => {
    const res = await api(studentToken).post("/problems", {
      contestId,
      letter: "Z",
      title: "Hacked",
    });
    expect(res.status).toBe(403);
  });

  test("Delete problem", async () => {
    const res = await api(adminToken).delete(`/problems/${problemId}`);
    expect(res.status).toBe(200);
  });

  test("Get deleted problem — 404", async () => {
    const res = await api(adminToken).get(`/problems/${problemId}`);
    expect(res.status).toBe(404);
  });
});
