require("dotenv").config();
const jwt = require("jsonwebtoken");

const rawBase = process.env.BASE_URL || "http://localhost:3000";
const BASE = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

async function api(method, endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  const login = await api("POST", "/auth/student/login", {
    email: "demo.student@sut.edu.eg",
    universityId: "DEMO2026",
  });

  if (!login.ok) {
    throw new Error(`student login failed: ${JSON.stringify(login.data)}`);
  }

  const realToken = login.data.data.accessToken;
  const payload = jwt.decode(realToken);

  const staleToken = jwt.sign(
    {
      id: "65f0f0f0f0f0f0f0f0f0f0f0",
      role: "student",
      email: payload.email,
      fullName: payload.fullName,
      lab: payload.lab,
      group: payload.group,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "2h" }
  );

  const problems = await api("GET", "/problems/contest", null, staleToken);
  if (!problems.ok || !problems.data.data?.length) {
    throw new Error(`problem fetch failed: ${JSON.stringify(problems.data)}`);
  }

  const p = problems.data.data[0];
  const run = await api(
    "POST",
    "/submissions/run",
    {
      problemId: p._id,
      language: "python",
      code: "print('ok')",
    },
    staleToken
  );

  console.log(`status=${run.status}`);
  console.log(JSON.stringify(run.data));
})();
