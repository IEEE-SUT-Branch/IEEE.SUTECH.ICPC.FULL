const BASE = process.env.BASE_URL || "http://localhost:3000/api";

async function api(method, endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON from ${endpoint}: ${text.slice(0, 300)}`);
  }

  if (!res.ok || data.success === false) {
    throw new Error(`${endpoint} failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function ensureRunningContest(adminToken) {
  const all = await api("GET", "/contests", null, adminToken);
  const list = all.data || [];
  const running = list.find((c) => c.status === "running");
  if (running) return running._id;

  const notStarted = list.find((c) => c.status === "not_started");
  if (!notStarted) {
    throw new Error("No contest found to run compiler checks");
  }

  await api("POST", `/contests/${notStarted._id}/start`, {}, adminToken);
  return notStarted._id;
}

async function main() {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASS || "admin123";

  const adminLogin = await api("POST", "/auth/admin/login", {
    username: adminUser,
    password: adminPass,
  });

  const adminToken = adminLogin.data.accessToken;
  const contestId = await ensureRunningContest(adminToken);
  console.log(`contest_id=${contestId}`);

  const studentLogin = await api("POST", "/auth/student/login", {
    email: "demo.student@sut.edu.eg",
    universityId: "DEMO2026",
  });
  const studentToken = studentLogin.data.accessToken;

  const problems = await api("GET", "/problems/contest", null, studentToken);
  const problemA = (problems.data || []).find((p) => p.letter === "A") || (problems.data || [])[0];
  if (!problemA) throw new Error("No published student problem found");

  const checks = [
    {
      language: "cpp",
      code: "#include <iostream>\nusing namespace std;\nint main(){ long long a,b; if(!(cin>>a>>b)) return 0; cout << (a+b) << '\\n'; return 0; }",
    },
    {
      language: "python",
      code: "a, b = map(int, input().split())\nprint(a + b)",
    },
    {
      language: "java",
      code: "import java.util.*; public class Main { public static void main(String[] args){ Scanner sc = new Scanner(System.in); long a = sc.nextLong(); long b = sc.nextLong(); System.out.println(a + b); } }",
    },
  ];

  for (const c of checks) {
    const out = await api(
      "POST",
      "/submissions/run",
      { problemId: problemA._id, code: c.code, language: c.language },
      studentToken
    );

    const results = out.data.results || [];
    const allPassed = results.length > 0 && results.every((r) => r.passed);
    const backend = out.data.judgeBackend || (results.find((r) => r.backend) || {}).backend || "unknown";
    const first = results[0] || {};
    console.log(
      `${c.language}_pass=${allPassed} backend=${backend} samples=${results.length} ce=${Boolean(
        out.data.compilationError
      )} firstVerdict=${first.verdict || "n/a"} firstStderr=${(first.stderr || "").replace(/\s+/g, " ").slice(0, 80)}`
    );
  }

  const ce = await api(
    "POST",
    "/submissions/run",
    {
      problemId: problemA._id,
      language: "java",
      code: "import java.util.*; public class Main { public static void main(String[] args){ System.out.println( } }",
    },
    studentToken
  );
  console.log(`java_compilation_error_detected=${Boolean(ce.data.compilationError)}`);

  const wa = await api(
    "POST",
    "/submissions/run",
    {
      problemId: problemA._id,
      language: "python",
      code: "a, b = map(int, input().split())\nprint(a - b)",
    },
    studentToken
  );
  const waDetected = (wa.data.results || []).some((r) => !r.passed && r.verdict === "WA");
  console.log(`python_wa_detected=${waDetected}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
