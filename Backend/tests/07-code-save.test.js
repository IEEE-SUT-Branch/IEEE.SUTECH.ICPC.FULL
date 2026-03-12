const { startTestServer, stopTestServer } = require("./setup");
const { setBaseURL, getAdminToken, getStudentToken, api } = require("./helpers");
const Student = require("../src/models/Student");
const Contest = require("../src/models/Contest");
const Problem = require("../src/models/Problem");

let baseURL, adminToken, studentToken;
let contestId, problemId;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);

  await Student.create({
    fullName: "Save Test Student",
    universityId: "SUT500",
    email: "save@sut.edu.eg",
    labAssignment: "Lab 6",
    testGroup: "Sunday",
  });

  adminToken = await getAdminToken();
  studentToken = await getStudentToken("save@sut.edu.eg", "SUT500");

  // Create and start contest
  const contest = await Contest.create({
    title: "Save Test Contest",
    durationMinutes: 60,
    status: "running",
    startedAt: new Date(),
  });
  contestId = contest._id.toString();

  const problem = await Problem.create({
    contestId,
    letter: "A",
    title: "Save Test Problem",
    status: "published",
    order: 1,
  });
  problemId = problem._id.toString();
});

afterAll(async () => {
  await stopTestServer();
});

describe("Code Auto-Save", () => {
  test("Save code", async () => {
    const res = await api(studentToken).post("/code-save", {
      problemId,
      code: "#include<iostream>\nint main() { return 0; }",
      language: "cpp",
      cursorPosition: { line: 1, column: 20 },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.code).toContain("#include");
  });

  test("Update saved code (upsert)", async () => {
    const res = await api(studentToken).post("/code-save", {
      problemId,
      code: "#include<iostream>\nint main() { cout << 42; }",
      language: "cpp",
      cursorPosition: { line: 1, column: 30 },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.code).toContain("42");
  });

  test("Restore saved code", async () => {
    const res = await api(studentToken).get(`/code-save/${problemId}`);
    expect(res.status).toBe(200);
    expect(res.data.data.code).toContain("42");
    expect(res.data.data.language).toBe("cpp");
    expect(res.data.data.cursorPosition.line).toBe(1);
  });

  test("Restore all saved code", async () => {
    const res = await api(studentToken).get("/code-save/all");
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBe(1);
  });

  test("Restore nonexistent problem — returns null", async () => {
    const fakeId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const res = await api(studentToken).get(`/code-save/${fakeId}`);
    expect(res.status).toBe(200);
    expect(res.data.data).toBeNull();
  });
});