#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/api";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

const PROBLEMS = [
  {
    key: "problem1",
    letter: "A",
    order: 0,
    difficulty: "easy",
    root: path.join(__dirname, "problem1", "sutechapples-6"),
  },
  {
    key: "problem2",
    letter: "B",
    order: 1,
    difficulty: "easy",
    root: path.join(__dirname, "problem2", "team-formation-3"),
  },
  {
    key: "problem3",
    letter: "C",
    order: 2,
    difficulty: "medium",
    root: path.join(__dirname, "problem3", "valid-ecpc-password-1"),
  },
  {
    key: "problem4",
    letter: "D",
    order: 3,
    difficulty: "medium",
    root: path.join(__dirname, "problem4", "the-fast-coder-2"),
  },
  {
    key: "problem5",
    letter: "E",
    order: 4,
    difficulty: "hard",
    root: path.join(__dirname, "problem5", "campus-network-1"),
  },
];

async function api(method, endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${method} ${endpoint}] ${res.status} Invalid JSON: ${text.slice(0, 300)}`);
  }

  if (!res.ok || data.success === false) {
    throw new Error(`[${method} ${endpoint}] ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trim();
}

function findSolutionExecutable(problemRoot) {
  const solutionDir = path.join(problemRoot, "solutions");
  if (!fs.existsSync(solutionDir)) return null;

  const files = fs.readdirSync(solutionDir);
  const exe = files.find((name) => name.toLowerCase().endsWith(".exe"));
  if (!exe) return null;

  return path.join(solutionDir, exe);
}

function runSolution(exePath, input) {
  const output = execFileSync(exePath, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return output.replace(/\r\n/g, "\n").trimEnd() + "\n";
}

function loadVisibleExamples(statementDir) {
  if (!fs.existsSync(statementDir)) return [];

  const files = fs.readdirSync(statementDir);
  const examples = [];

  for (const file of files) {
    const match = file.match(/^example\.(\d{2})$/);
    if (!match) continue;

    const idx = match[1];
    const inputPath = path.join(statementDir, `example.${idx}`);
    const outputPath = path.join(statementDir, `example.${idx}.a`);
    if (!fs.existsSync(outputPath)) continue;

    examples.push({
      input: fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n"),
      expectedOutput: fs.readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n"),
      isVisible: true,
    });
  }

  examples.sort((a, b) => a.input.localeCompare(b.input));
  return examples;
}

function loadHiddenTests(problemRoot) {
  const testsDir = path.join(problemRoot, "tests");
  if (!fs.existsSync(testsDir)) return [];

  const solutionExe = findSolutionExecutable(problemRoot);
  if (!solutionExe) {
    throw new Error(`No solution executable found in ${path.join(problemRoot, "solutions")}`);
  }

  const files = fs.readdirSync(testsDir).filter((name) => /^\d+$/.test(name));
  files.sort((a, b) => Number(a) - Number(b));

  const tests = [];
  for (const name of files) {
    const inputPath = path.join(testsDir, name);
    const outputPath = path.join(testsDir, `${name}.a`);

    const input = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n");
    let expectedOutput;

    if (fs.existsSync(outputPath)) {
      expectedOutput = fs.readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n");
    } else {
      expectedOutput = runSolution(solutionExe, input);
    }

    tests.push({ input, expectedOutput, isVisible: false });
  }

  return tests;
}

function uniqueTestCases(testCases) {
  const seen = new Set();
  const unique = [];

  for (const tc of testCases) {
    const key = `${tc.input}\n---\n${tc.expectedOutput}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(tc);
  }

  return unique;
}

function buildProblemPayload(problem, contestId) {
  const statementDir = path.join(problem.root, "statement-sections", "english");

  const title = readIfExists(path.join(statementDir, "name.tex")) || `${problem.key}`;
  const description = readIfExists(path.join(statementDir, "legend.tex"));
  const inputDescription = readIfExists(path.join(statementDir, "input.tex"));
  const outputDescription = readIfExists(path.join(statementDir, "output.tex"));
  const notes = readIfExists(path.join(statementDir, "notes.tex"));

  const visibleExamples = loadVisibleExamples(statementDir);
  const hiddenTests = loadHiddenTests(problem.root);
  const testCases = uniqueTestCases([...visibleExamples, ...hiddenTests]);

  return {
    payload: {
      contestId,
      letter: problem.letter,
      title,
      description,
      inputDescription,
      outputDescription,
      notes,
      timeLimitSeconds: 1,
      memoryLimitMB: 256,
      difficulty: problem.difficulty,
      order: problem.order,
      testCases,
    },
    summary: {
      title,
      visible: visibleExamples.length,
      hidden: hiddenTests.length,
      total: testCases.length,
    },
  };
}

async function loginAdmin() {
  const data = await api("POST", "/auth/admin/login", {
    username: ADMIN_USER,
    password: ADMIN_PASS,
  });
  return data.data.accessToken;
}

async function resolveContestId(token) {
  const active = await api("GET", "/contests/active", null, token);
  if (active.data?._id) return active.data._id;

  const all = await api("GET", "/contests", null, token);
  const list = Array.isArray(all.data) ? all.data : [];

  const preferred = list.find((c) => c.status === "not_started") || list[0];
  if (!preferred?._id) {
    throw new Error("No contest found. Please create a contest first.");
  }

  return preferred._id;
}

async function upsertProblem(token, contestId, problem) {
  const { payload, summary } = buildProblemPayload(problem, contestId);

  const existingResp = await api("GET", `/problems?contestId=${contestId}`, null, token);
  const existing = (existingResp.data || []).find((p) => p.letter === problem.letter);

  let saved;
  if (existing) {
    saved = await api("PUT", `/problems/${existing._id}`, payload, token);
  } else {
    saved = await api("POST", "/problems", payload, token);
  }

  const problemId = saved.data._id;
  await api("PATCH", `/problems/${problemId}/publish`, {}, token);

  return {
    problemId,
    title: summary.title,
    letter: problem.letter,
    visible: summary.visible,
    hidden: summary.hidden,
    total: summary.total,
    mode: existing ? "updated" : "created",
  };
}

async function main() {
  console.log("=".repeat(70));
  console.log("Uploading ECPC Problems A/B/C/D/E");
  console.log("=".repeat(70));

  const token = await loginAdmin();
  const contestId = await resolveContestId(token);
  console.log(`Contest ID: ${contestId}`);

  const results = [];
  for (const problem of PROBLEMS) {
    console.log(`\n[${problem.letter}] Processing ${problem.key} ...`);
    const result = await upsertProblem(token, contestId, problem);
    results.push(result);
    console.log(
      `  ${result.mode.toUpperCase()} ${result.letter} ${result.title} | visible=${result.visible} hidden=${result.hidden} total=${result.total}`
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("Upload summary");
  for (const r of results) {
    console.log(
      `${r.letter} | ${r.title} | ${r.mode} | tests: ${r.visible} visible + ${r.hidden} hidden = ${r.total}`
    );
  }
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("\nUPLOAD FAILED:", err.message);
  process.exit(1);
});
