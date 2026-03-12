const { startTestServer, stopTestServer } = require("./setup");
const {
  setBaseURL,
  getAdminToken,
  getStudentToken,
  api,
} = require("./helpers");
const Student = require("../src/models/Student");
const axios = require("axios");

let baseURL, adminToken, studentToken;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);

  await Student.create({
    fullName: "Perm Test Student",
    universityId: "SUT600",
    email: "perm@sut.edu.eg",
    labAssignment: "Lab 5",
    testGroup: "Sunday",
  });

  adminToken = await getAdminToken();
  studentToken = await getStudentToken("perm@sut.edu.eg", "SUT600");
});

afterAll(async () => {
  await stopTestServer();
});

describe("Permission Guards", () => {
  test("Student cannot access /monitor/*", async () => {
    const res = await api(studentToken).get("/monitor/overview");
    expect(res.status).toBe(403);
  });

  test("Student cannot create contests", async () => {
    const res = await api(studentToken).post("/contests", {
      title: "Hacked Contest",
    });
    expect(res.status).toBe(403);
  });

  test("Student cannot create problems", async () => {
    const res = await api(studentToken).post("/problems", {
      contestId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      letter: "Z",
      title: "Hacked Problem",
    });
    expect(res.status).toBe(403);
  });

  test("Student cannot view all submissions", async () => {
    const res = await api(studentToken).get("/submissions");
    expect(res.status).toBe(403);
  });

  test("Student cannot export standings", async () => {
    const res = await api(studentToken).get("/standings/export");
    expect(res.status).toBe(403);
  });

  test("No token — 401 on protected routes", async () => {
    const res = await axios
      .get(`${baseURL}/api/contests`)
      .catch((e) => e.response);
    expect(res.status).toBe(401);
  });

  test("Invalid token — 401", async () => {
    const res = await api("totally.fake.token").get("/contests");
    expect(res.status).toBe(401);
  });

  test("Email system still uses x-api-key (not JWT)", async () => {
    // Without x-api-key
    const res1 = await axios
      .get(`${baseURL}/api/students`)
      .catch((e) => e.response);
    expect(res1.status).toBe(401);

    // With x-api-key
    const res2 = await axios.get(`${baseURL}/api/students`, {
      headers: {
        "x-api-key":
          process.env.ADMIN_API_KEY || "change_this_to_something_secret",
      },
    });
    expect(res2.status).toBe(200);
  });
});
