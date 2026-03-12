#!/usr/bin/env node
/**
 * Upload sutech-apples (Problem A) to the IEEE ECPC Platform.
 * Reads 21 sample test cases from statement-sections and uploads via API.
 * Uses Node.js built-in fetch (Node 18+).
 */

const fs   = require("fs");
const path = require("path");

const BASE_URL     = "http://localhost:3000/api";
const ADMIN_USER   = "admin";
const ADMIN_PASS   = "admin123";
const CONTEST_ID   = "69b233d320797361f7a2ed91"; // PLacement test stage1 (running)
const EXAMPLES_DIR = path.join(__dirname,
  "sutechapples-4", "statement-sections", "english");

// ─── Helpers ────────────────────────────────────────────────────────────────
async function api(method, endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`[${method} ${endpoint}] ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ─── Login ───────────────────────────────────────────────────────────────────
async function getToken() {
  const data = await api("POST", "/auth/admin/login", {
    username: ADMIN_USER,
    password: ADMIN_PASS,
  });
  console.log("  [✓] Logged in as admin");
  return data.data.accessToken;
}

// ─── Load test cases from example files ─────────────────────────────────────
function loadTestCases() {
  const cases = [];
  let i = 1;
  while (true) {
    const inpPath = path.join(EXAMPLES_DIR, `example.${String(i).padStart(2, "0")}`);
    const outPath = path.join(EXAMPLES_DIR, `example.${String(i).padStart(2, "0")}.a`);
    if (!fs.existsSync(inpPath) || !fs.existsSync(outPath)) break;
    const input          = fs.readFileSync(inpPath, "utf-8").replace(/\r\n/g, "\n");
    const expectedOutput = fs.readFileSync(outPath, "utf-8").replace(/\r\n/g, "\n");
    cases.push({ input, expectedOutput, isVisible: true });
    i++;
  }
  console.log(`  [✓] Loaded ${cases.length} test cases from statement-sections`);
  return cases;
}

// ─── Check for existing problem A ───────────────────────────────────────────
async function findExisting(token) {
  const data = await api("GET", `/problems?contestId=${CONTEST_ID}`, null, token);
  const existing = data.data.find((p) => p.letter === "A");
  return existing ? existing._id : null;
}

// ─── Create problem ──────────────────────────────────────────────────────────
async function createProblem(token, testCases) {
  const payload = {
    contestId: CONTEST_ID,
    letter:    "A",
    title:     "sutech-apples",

    description: [
      "The IEEE SUTech branch is organizing a welcome event for the students",
      "who registered for the upcoming ECPC qualifications. To keep everyone",
      "energetic during the contest, the organizing committee decided to distribute",
      "fresh apples.",
      "",
      "There are $N$ students standing in a line. The $i$-th student requested",
      "exactly $A_i$ apples. However, the committee has a strict fairness policy:",
      "any student who asks for strictly more than $X$ apples is considered greedy",
      "and will be penalized by receiving exactly $0$ apples. All other students",
      "(who asked for $X$ apples or fewer) will receive exactly the number of apples",
      "they requested.",
      "",
      "Your task is to write a program that calculates the total number of apples",
      "the committee needs to distribute to all $N$ students.",
    ].join("\n"),

    inputDescription: [
      "The first line of the input contains two space-separated integers $N$ and $X$",
      "($1 \\le N \\le 100$, $1 \\le X \\le 100$) — the number of students and the",
      "maximum allowed apples per student, respectively.",
      "The second line contains $N$ space-separated integers $A_1, A_2, \\dots, A_N$",
      "($1 \\le A_i \\le 100$) — where $A_i$ is the number of apples requested by",
      "the $i$-th student.",
    ].join("\n"),

    outputDescription:
      "Print a single integer representing the total number of apples the committee will distribute.",

    notes: [
      "Iterate through the array. For each element $A_i$, if $A_i \\le X$,",
      "add $A_i$ to a running sum variable. Finally, print the sum.",
      "Time Complexity: $O(N)$",
      "Space Complexity: $O(1)$ or $O(N)$ depending on input reading method.",
    ].join("\n"),

    timeLimitSeconds: 1,
    memoryLimitMB:    256,
    difficulty:       "easy",
    order:            0,
    testCases,
  };

  const data = await api("POST", "/problems", payload, token);
  const id   = data.data._id;
  console.log(`  [✓] Problem created → ID: ${id}`);
  return id;
}

// ─── Publish ─────────────────────────────────────────────────────────────────
async function publish(token, problemId) {
  const data = await api("PATCH", `/problems/${problemId}/publish`, {}, token);
  console.log("  [✓] Problem published successfully");
  return data.data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  sutech-apples Upload Script");
  console.log("  IEEE ECPC Platform — Problem A");
  console.log("=".repeat(60));

  const token = await getToken();

  // Check if problem A already exists (idempotent)
  let existingId = await findExisting(token);
  let result;

  if (existingId) {
    console.log(`  [!] Problem A already exists (ID: ${existingId})`);
    console.log("  [!] Publishing existing problem...");
    result = await publish(token, existingId);
  } else {
    const testCases = loadTestCases();
    const problemId = await createProblem(token, testCases);
    result          = await publish(token, problemId);
  }

  console.log();
  console.log("=".repeat(60));
  console.log("  UPLOAD SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Title       : ${result.title}`);
  console.log(`  Letter      : ${result.letter}`);
  console.log(`  Status      : ${result.status}`);
  console.log(`  Difficulty  : ${result.difficulty}`);
  console.log(`  Time Limit  : ${result.timeLimitSeconds}s`);
  console.log(`  Memory      : ${result.memoryLimitMB} MB`);
  console.log(`  Test Cases  : ${result.testCases.length}`);
  console.log(`  Problem ID  : ${result._id}`);
  console.log("=".repeat(60));
  console.log("  [✓] Done! Problem is live on the platform.");
}

main().catch((err) => {
  console.error("\n  [✗] UPLOAD FAILED:", err.message);
  process.exit(1);
});
