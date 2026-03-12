const { startTestServer, stopTestServer, clearDB } = require("./setup");
const { setBaseURL, api } = require("./helpers");
const axios = require("axios");
const Student = require("../src/models/Student");
const bcrypt = require("bcryptjs");
const Admin = require("../src/models/Admin");

let baseURL;

beforeAll(async () => {
  const env = await startTestServer();
  baseURL = env.baseURL;
  setBaseURL(baseURL);

  // Seed test student
  await Student.create({
    fullName: "Test Student",
    universityId: "SUT001",
    email: "test@sut.edu.eg",
    labAssignment: "Lab 5",
    testGroup: "Sunday",
  });
});

afterAll(async () => {
  await stopTestServer();
});

describe("Admin Auth", () => {
  test("POST /api/auth/admin/login — valid credentials", async () => {
    const res = await axios.post(`${baseURL}/api/auth/admin/login`, {
      username: "testadmin",
      password: "testpass123",
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.accessToken).toBeDefined();
    expect(res.data.data.refreshToken).toBeDefined();
    expect(res.data.data.admin.role).toBe("admin");
  });

  test("POST /api/auth/admin/login — wrong password", async () => {
    const res = await axios
      .post(`${baseURL}/api/auth/admin/login`, {
        username: "testadmin",
        password: "wrong",
      })
      .catch((e) => e.response);
    expect(res.status).toBe(401);
  });

  test("POST /api/auth/admin/login — missing fields", async () => {
    const res = await axios
      .post(`${baseURL}/api/auth/admin/login`, {})
      .catch((e) => e.response);
    expect(res.status).toBe(400);
  });
});

describe("Student Auth", () => {
  test("POST /api/auth/student/login — valid credentials", async () => {
    const res = await axios.post(`${baseURL}/api/auth/student/login`, {
      email: "test@sut.edu.eg",
      universityId: "SUT001",
    });
    expect(res.status).toBe(200);
    expect(res.data.data.accessToken).toBeDefined();
    expect(res.data.data.student.fullName).toBe("Test Student");
  });

  test("POST /api/auth/student/login — wrong universityId", async () => {
    const res = await axios
      .post(`${baseURL}/api/auth/student/login`, {
        email: "test@sut.edu.eg",
        universityId: "WRONG",
      })
      .catch((e) => e.response);
    expect(res.status).toBe(401);
  });

  test("POST /api/auth/student/login — nonexistent email", async () => {
    const res = await axios
      .post(`${baseURL}/api/auth/student/login`, {
        email: "nobody@sut.edu.eg",
        universityId: "SUT001",
      })
      .catch((e) => e.response);
    expect(res.status).toBe(401);
  });
});

describe("Token Refresh", () => {
  test("POST /api/auth/refresh — valid refresh token", async () => {
    const login = await axios.post(`${baseURL}/api/auth/admin/login`, {
      username: "testadmin",
      password: "testpass123",
    });
    const { refreshToken } = login.data.data;

    const res = await axios.post(`${baseURL}/api/auth/refresh`, {
      refreshToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.data.accessToken).toBeDefined();
  });
});

describe("GET /api/auth/me", () => {
  test("returns user info with valid token", async () => {
    const login = await axios.post(`${baseURL}/api/auth/admin/login`, {
      username: "testadmin",
      password: "testpass123",
    });
    const token = login.data.data.accessToken;

    const res = await api(token).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.data.data.username).toBe("testadmin");
  });

  test("returns 401 without token", async () => {
    const res = await axios
      .get(`${baseURL}/api/auth/me`)
      .catch((e) => e.response);
    expect(res.status).toBe(401);
  });
});
