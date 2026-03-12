const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const axios = require("axios");
const logger = require("../config/logger");
const env = require("../config/env");
const SimpleQueue = require("../utils/queue");

const JUDGE_CONCURRENCY = env.judge.concurrency;
const execQueue = new SimpleQueue(JUDGE_CONCURRENCY);
const MAX_OUTPUT_CHARS = env.judge.maxOutputChars;
const MAX_STDERR_CHARS = env.judge.maxStderrChars;
const COMPILE_TIMEOUT_MS = env.judge.compileTimeoutMs;
const DEFAULT_COMPARE_MODE = env.judge.compareMode;
const PISTON_DISABLE_WINDOW_MS = Math.max(
  60000,
  parseInt(process.env.PISTON_DISABLE_WINDOW_MS || "600000", 10)
);
let pistonDisabledUntil = 0;
let pistonDisableReason = null;

function isPistonTemporarilyDisabled() {
  return Date.now() < pistonDisabledUntil;
}

function handlePistonFailure(err) {
  const status = err?.response?.status;
  const now = Date.now();

  if (status === 401 || status === 403) {
    pistonDisabledUntil = now + PISTON_DISABLE_WINDOW_MS;
    pistonDisableReason = `auth_${status}`;
    const minutes = Math.ceil(PISTON_DISABLE_WINDOW_MS / 60000);
    logger.warn(
      `Piston unavailable (${status}); skipping Piston for ${minutes} minute(s) and using fallback backends`
    );
    return;
  }

  logger.warn(`Piston failed: ${err.message}`);
}

/* ================================================================
   1. DETECT LOCAL RUNTIMES (runs once at startup)
   ================================================================ */
function commandExists(cmd) {
  try {
    execSync(process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`, {
      stdio: "ignore",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

function detectPython() {
  for (const cmd of ["python3", "python"]) {
    if (!commandExists(cmd)) continue;
    try {
      const ver = execSync(`${cmd} --version`, {
        stdio: "pipe",
        timeout: 5000,
      })
        .toString()
        .trim();
      if (ver.startsWith("Python 3")) return cmd;
    } catch {
      /* skip */
    }
  }
  return null;
}

const PYTHON_CMD = detectPython();
const HAS_GPP = commandExists("g++");
const HAS_JAVAC = commandExists("javac");

logger.info(
  `Judge runtimes — python: ${
    PYTHON_CMD || "none"
  }, g++: ${HAS_GPP}, javac: ${HAS_JAVAC}`
);

function canRunLocally(lang) {
  if (lang === "python") return !!PYTHON_CMD;
  if (lang === "cpp") return HAS_GPP;
  if (lang === "java") return HAS_JAVAC;
  return false;
}

function normalizeForJudge(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

function normalizeExact(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function normalizeTokens(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function compareOutputs(expected, actual, mode) {
  const compareMode = (mode || DEFAULT_COMPARE_MODE || "token").toLowerCase();

  if (compareMode === "exact") {
    return normalizeExact(expected) === normalizeExact(actual);
  }

  if (compareMode === "line") {
    return normalizeForJudge(expected) === normalizeForJudge(actual);
  }

  const e = normalizeTokens(expected);
  const a = normalizeTokens(actual);
  if (e.length !== a.length) return false;
  for (let i = 0; i < e.length; i++) {
    if (e[i] !== a[i]) return false;
  }
  return true;
}

/* ================================================================
   2. LOCAL EXECUTION ENGINE
   ================================================================ */
function runLocal(code, language, stdin, timeLimitMs, memoryLimitMB = 256) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(6).toString("hex");
    const tmpDir = path.join(os.tmpdir(), `judge-${id}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const cleanup = () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    };

    let cmd, args;

    try {
      /* ── Python ───────────────────────────── */
      if (language === "python") {
        const fp = path.join(tmpDir, "solution.py");
        fs.writeFileSync(fp, code, "utf-8");
        cmd = PYTHON_CMD;
        args = ["-u", fp]; // -u = unbuffered stdout

        /* ── C++ ─────────────────────────────── */
      } else if (language === "cpp") {
        const src = path.join(tmpDir, "solution.cpp");
        const bin = path.join(
          tmpDir,
          process.platform === "win32" ? "solution.exe" : "solution"
        );
        fs.writeFileSync(src, code, "utf-8");

        try {
          execSync(`g++ -std=gnu++20 -O2 -pipe -o "${bin}" "${src}"`, {
            timeout: COMPILE_TIMEOUT_MS,
            cwd: tmpDir,
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch (ce) {
          cleanup();
          return resolve({
            compile: {
              code: 1,
              stderr: (ce.stderr || ce.message || "")
                .toString()
                .substring(0, MAX_STDERR_CHARS),
              output: "",
            },
            run: null,
            backend: "local",
          });
        }

        cmd = bin;
        args = [];

        /* ── Java ────────────────────────────── */
      } else if (language === "java") {
        const fp = path.join(tmpDir, "Main.java");
        fs.writeFileSync(fp, code, "utf-8");

        try {
          execSync(`javac -encoding UTF-8 "${fp}"`, {
            timeout: COMPILE_TIMEOUT_MS,
            cwd: tmpDir,
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch (ce) {
          cleanup();
          return resolve({
            compile: {
              code: 1,
              stderr: (ce.stderr || ce.message || "")
                .toString()
                .substring(0, MAX_STDERR_CHARS),
              output: "",
            },
            run: null,
            backend: "local",
          });
        }

        cmd = "java";
        args = [`-Xmx${Math.max(64, memoryLimitMB)}m`, "-cp", tmpDir, "Main"];
      } else {
        cleanup();
        return reject(new Error(`Unsupported language: ${language}`));
      }

      /* ── Spawn process & collect output ── */
      const proc = spawn(cmd, args, {
        cwd: tmpDir,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let killed = false;
      let killReason = null;
      const startedAt = Date.now();

      proc.stdout.on("data", (chunk) => {
        if (stdout.length < MAX_OUTPUT_CHARS) {
          stdout += chunk.toString();
        }

        if (stdout.length > MAX_OUTPUT_CHARS) {
          killed = true;
          killReason = "OUTPUT_LIMIT";
          try {
            proc.kill("SIGKILL");
          } catch {
            /* already dead */
          }
        }
      });
      proc.stderr.on("data", (chunk) => {
        if (stderr.length < MAX_STDERR_CHARS) {
          stderr += chunk.toString();
        }
      });

      const timer = setTimeout(() => {
        killed = true;
        killReason = "TIME_LIMIT";
        try {
          proc.kill("SIGKILL");
        } catch {
          /* already dead */
        }
      }, timeLimitMs);

      proc.on("error", (err) => {
        clearTimeout(timer);
        cleanup();
        reject(err);
      });

      proc.on("close", (exitCode) => {
        clearTimeout(timer);
        cleanup();
        const executionTimeMs = Date.now() - startedAt;
        resolve({
          compile: { code: 0, stderr: "", output: "" },
          backend: "local",
          run: {
            stdout,
            stderr,
            code: killed ? 1 : exitCode ?? 0,
            signal: killed ? "SIGKILL" : null,
            killReason,
            executionTimeMs,
          },
        });
      });

      // Feed stdin and close
      if (stdin != null && stdin !== "") {
        proc.stdin.write(stdin);
        if (!stdin.endsWith("\n")) proc.stdin.write("\n");
      }
      proc.stdin.end();
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

/* ================================================================
   3. WANDBOX REMOTE FALLBACK (no key needed)
   ================================================================ */
const WANDBOX_URL = "https://wandbox.org/api/compile.json";

const COMPILER_MAP = {
  // Wandbox compiler identifiers change over time; gcc-head is stable and currently valid.
  cpp: "gcc-head",
  python: "cpython-3.10.2",
  java: "openjdk-jdk-17+35",
};

async function runWandbox(code, language, stdin, timeLimitMs) {
  const compiler = COMPILER_MAP[language];
  if (!compiler) throw new Error(`Unsupported language: ${language}`);

  const { data } = await axios.post(
    WANDBOX_URL,
    {
      code,
      compiler,
      stdin: stdin || "",
      options: "",
      "compiler-option-raw": language === "cpp" ? "-std=c++17" : "",
      "runtime-option-raw": "",
      save: false,
    },
    {
      timeout: timeLimitMs + 30000,
      headers: { "Content-Type": "application/json" },
    }
  );

  return {
    backend: "wandbox",
    compile: {
      code: data.compiler_error ? 1 : 0,
      stderr: data.compiler_error || "",
      output: data.compiler_message || "",
    },
    run: {
      stdout: data.program_output || "",
      stderr: data.program_error || "",
      code:
        data.status === "0" || data.status === 0
          ? 0
          : parseInt(data.status) || 1,
      signal: data.signal || null,
      executionTimeMs: Math.round((Number(data.program_time || 0) || 0) * 1000),
    },
  };
}

/* ================================================================
   4. PISTON REMOTE FALLBACK (reliable and free)
   ================================================================ */
const PISTON_LANGUAGE_MAP = {
  cpp: "c++",
  python: "python",
  java: "java",
};

const PISTON_VERSION_MAP = {
  cpp: process.env.PISTON_CPP_VERSION || "10.2.0",
  python: process.env.PISTON_PYTHON_VERSION || "3.10.0",
  java: process.env.PISTON_JAVA_VERSION || "15.0.2",
};

async function runPiston(code, language, stdin, timeLimitMs, memoryLimitMB) {
  const pistonLang = PISTON_LANGUAGE_MAP[language];
  const pistonVersion = PISTON_VERSION_MAP[language];
  if (!pistonLang) throw new Error(`Unsupported language: ${language}`);

  const runMemoryLimit = Math.max(64, (memoryLimitMB || 256) * 1024 * 1024);

  const { data } = await axios.post(
    `${env.piston.url}/execute`,
    {
      language: pistonLang,
      version: pistonVersion,
      files: [
        {
          name:
            language === "python"
              ? "main.py"
              : language === "java"
              ? "Main.java"
              : "main.cpp",
          content: code,
        },
      ],
      stdin: stdin || "",
      compile_timeout: COMPILE_TIMEOUT_MS,
      run_timeout: timeLimitMs,
      compile_memory_limit: runMemoryLimit,
      run_memory_limit: runMemoryLimit,
    },
    {
      timeout: timeLimitMs + COMPILE_TIMEOUT_MS + 15000,
      headers: { "Content-Type": "application/json" },
    }
  );

  const compile = data.compile || {};
  const run = data.run || {};
  const compileCode = Number.isFinite(compile.code) ? compile.code : 0;
  const runCode = Number.isFinite(run.code) ? run.code : 0;

  let signal = run.signal || null;
  if (!signal && typeof run.stderr === "string") {
    const stderrLower = run.stderr.toLowerCase();
    if (stderrLower.includes("time") && stderrLower.includes("limit")) {
      signal = "SIGKILL";
    }
  }

  const executionTimeMs = Math.round(
    (Number(run.wall_time || run.cpu_time || 0) || 0) * 1000
  );

  return {
    backend: "piston",
    compile: {
      code: compileCode,
      stderr: String(compile.stderr || ""),
      output: String(compile.output || ""),
    },
    run: {
      stdout: String(run.stdout || ""),
      stderr: String(run.stderr || ""),
      code: runCode,
      signal,
      executionTimeMs,
    },
  };
}

/* ================================================================
   5. JDOODLE REMOTE FALLBACK (optional, needs env vars)
   ================================================================ */
const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";

const JDOODLE_MAP = {
  cpp: { language: "cpp17", versionIndex: "0" },
  python: { language: "python3", versionIndex: "4" },
  java: { language: "java", versionIndex: "4" },
};

async function runJDoodle(code, language, stdin, timeLimitMs) {
  const lang = JDOODLE_MAP[language];

  const { data } = await axios.post(
    JDOODLE_URL,
    {
      clientId: env.jdoodle.clientId,
      clientSecret: env.jdoodle.clientSecret,
      script: code,
      stdin: stdin || "",
      language: lang.language,
      versionIndex: lang.versionIndex,
    },
    { timeout: timeLimitMs + 30000 }
  );

  const hasError = data.statusCode !== 200;

  return {
    backend: "jdoodle",
    compile: {
      code: hasError && data.output?.includes("error") ? 1 : 0,
      stderr: hasError ? data.output || "" : "",
      output: "",
    },
    run: {
      stdout: hasError ? "" : data.output || "",
      stderr: "",
      code: hasError ? 1 : 0,
      signal: data.cpuTime > timeLimitMs / 1000 ? "SIGKILL" : null,
      executionTimeMs: Math.round((Number(data.cpuTime || 0) || 0) * 1000),
    },
  };
}

/* ================================================================
  6. UNIFIED runSingle  (local → Piston → Wandbox → JDoodle)
   ================================================================ */
async function runSingle(code, language, stdin, timeLimitMs, memoryLimitMB) {
  // Priority 1 — local process (fastest, most reliable)
  if (canRunLocally(language)) {
    try {
      return await runLocal(code, language, stdin, timeLimitMs, memoryLimitMB);
    } catch (err) {
      logger.warn(`Local exec failed (${language}): ${err.message}`);
    }
  }

  // Priority 2 — Piston
  if (!isPistonTemporarilyDisabled()) {
    try {
      return await runPiston(code, language, stdin, timeLimitMs, memoryLimitMB);
    } catch (err) {
      handlePistonFailure(err);
    }
  } else if (pistonDisableReason) {
    logger.debug(
      `Skipping Piston fallback (${pistonDisableReason}) until ${new Date(
        pistonDisabledUntil
      ).toISOString()}`
    );
  }

  // Priority 3 — Wandbox
  try {
    return await runWandbox(code, language, stdin, timeLimitMs);
  } catch (err) {
    logger.warn(`Wandbox failed: ${err.message}`);
  }

  // Priority 4 — JDoodle
  if (env.jdoodle?.clientId) {
    try {
      return await runJDoodle(code, language, stdin, timeLimitMs);
    } catch (err) {
      logger.warn(`JDoodle failed: ${err.message}`);
    }
  }

  throw new Error(
    "All judge backends unavailable (local, piston, wandbox, jdoodle)"
  );
}

/* ================================================================
   7. JUDGE — evaluate against ALL test cases
   ================================================================ */
async function judge(
  code,
  language,
  testCases,
  timeLimitSeconds,
  memoryLimitMB,
  compareMode
) {
  const timeLimitMs = (timeLimitSeconds || 2) * 1000;
  const results = [];
  let verdict = "AC";
  let judgeBackend = null;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const res = await runSingle(
        code,
        language,
        tc.input,
        timeLimitMs,
        memoryLimitMB
      );
      if (!judgeBackend && res.backend) judgeBackend = res.backend;

      // Compilation error
      if (res.compile.code !== 0 && res.compile.stderr) {
        return {
          verdict: "CE",
          judgeBackend,
          testCaseResults: [
            {
              testCaseIndex: i + 1,
              passed: false,
              verdict: "CE",
              backend: res.backend || judgeBackend || null,
              executionTimeMs: 0,
              stderr: res.compile.stderr.substring(0, MAX_STDERR_CHARS),
            },
          ],
        };
      }

      // No run output (compile only / broken)
      if (!res.run) {
        results.push({
          testCaseIndex: i + 1,
          passed: false,
          verdict: "RE",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: null,
          stderr: "No run output from judge",
        });
        verdict = "RE";
        break;
      }

      // Time / memory kill
      if (res.run.signal === "SIGKILL") {
        const isOutputLimit = res.run.killReason === "OUTPUT_LIMIT";
        results.push({
          testCaseIndex: i + 1,
          passed: false,
          verdict: isOutputLimit ? "MLE" : "TLE",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: res.run.executionTimeMs || timeLimitMs,
          stderr: isOutputLimit
            ? "Output limit exceeded"
            : "Time limit exceeded",
        });
        verdict = isOutputLimit ? "MLE" : "TLE";
        break;
      }

      // Runtime error (non-zero exit AND has stderr)
      if (res.run.code !== 0) {
        results.push({
          testCaseIndex: i + 1,
          passed: false,
          verdict: "RE",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: res.run.executionTimeMs || null,
          stderr:
            (res.run.stderr || "Runtime error (non-zero exit code)")
              .substring(0, MAX_STDERR_CHARS),
        });
        verdict = "RE";
        break;
      }

      const rawActual = res.run.stdout || "";
      const rawExpected = tc.expectedOutput || "";
      const passed = compareOutputs(rawExpected, rawActual, compareMode);

      if (passed) {
        results.push({
          testCaseIndex: i + 1,
          passed: true,
          verdict: "AC",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: res.run.executionTimeMs || null,
          stderr: "",
        });
      } else {
        results.push({
          testCaseIndex: i + 1,
          passed: false,
          verdict: "WA",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: res.run.executionTimeMs || null,
          stderr: "Wrong output",
          expectedOutputPreview: normalizeForJudge(rawExpected).substring(0, 300),
          actualOutputPreview: normalizeForJudge(rawActual).substring(0, 300),
        });
        verdict = "WA";
        break;
      }
    } catch (err) {
      logger.error(`Judge error (TC ${i}): ${err.message}`);
      results.push({
        testCaseIndex: i + 1,
        passed: false,
        verdict: "RE",
        backend: judgeBackend,
        executionTimeMs: null,
        stderr: err.message,
      });
      verdict = "RE";
      break;
    }
  }

  return { verdict, judgeBackend, testCaseResults: results };
}

function judgeQueued(
  code,
  language,
  testCases,
  timeLimitSeconds,
  memoryLimitMB,
  compareMode
) {
  return execQueue.add(() =>
    judge(
      code,
      language,
      testCases,
      timeLimitSeconds,
      memoryLimitMB,
      compareMode
    )
  );
}

/* ================================================================
   8. RUN SAMPLES — visible test cases only (student debugging)
   ================================================================ */
async function runSamples(
  code,
  language,
  visibleTestCases,
  timeLimitSeconds,
  memoryLimitMB,
  compareMode
) {
  const timeLimitMs = (timeLimitSeconds || 2) * 1000;
  const results = [];
  let judgeBackend = null;

  for (let i = 0; i < visibleTestCases.length; i++) {
    const tc = visibleTestCases[i];
    try {
      const res = await runSingle(
        code,
        language,
        tc.input,
        timeLimitMs,
        memoryLimitMB
      );
      if (!judgeBackend && res.backend) judgeBackend = res.backend;

      if (res.compile.code !== 0 && res.compile.stderr) {
        return {
          verdict: "CE",
          judgeBackend,
          compilationError: res.compile.stderr.substring(0, MAX_STDERR_CHARS),
          results: [],
        };
      }

      if (!res.run) {
        results.push({
          testCaseIndex: i + 1,
          input: tc.input,
          expectedOutput: (tc.expectedOutput || "").trim(),
          actualOutput: "",
          passed: false,
          verdict: "RE",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: null,
          stderr: "No run output from judge",
        });
        continue;
      }

      if (res.run.signal === "SIGKILL") {
        const isOutputLimit = res.run.killReason === "OUTPUT_LIMIT";
        results.push({
          testCaseIndex: i + 1,
          input: tc.input,
          expectedOutput: (tc.expectedOutput || "").trim(),
          actualOutput: "",
          passed: false,
          verdict: isOutputLimit ? "MLE" : "TLE",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: res.run.executionTimeMs || timeLimitMs,
          stderr: isOutputLimit
            ? "Output limit exceeded"
            : "Time limit exceeded",
        });
        continue;
      }

      if (res.run.code !== 0) {
        results.push({
          testCaseIndex: i + 1,
          input: tc.input,
          expectedOutput: (tc.expectedOutput || "").trim(),
          actualOutput: "",
          passed: false,
          verdict: "RE",
          backend: res.backend || judgeBackend || null,
          executionTimeMs: res.run.executionTimeMs || null,
          stderr:
            (res.run.stderr || "Runtime error (non-zero exit code)")
              .substring(0, MAX_STDERR_CHARS),
        });
        continue;
      }

      const rawActual = res.run?.stdout || "";
      const rawExpected = tc.expectedOutput || "";
      const passed = compareOutputs(rawExpected, rawActual, compareMode);
      const actual = normalizeForJudge(rawActual);
      const expected = normalizeForJudge(rawExpected);

      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expectedOutput: expected,
        actualOutput: actual,
        passed,
        verdict: passed ? "AC" : "WA",
        backend: res.backend || judgeBackend || null,
        executionTimeMs: res.run.executionTimeMs || null,
        stderr: (res.run?.stderr || "").substring(0, MAX_STDERR_CHARS),
      });
    } catch (err) {
      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expectedOutput: (tc.expectedOutput || "").trim(),
        actualOutput: "",
        passed: false,
        verdict: "RE",
        backend: judgeBackend || null,
        executionTimeMs: null,
        stderr: err.message,
      });
    }
  }

  const verdictBreakdown = {
    AC: 0,
    WA: 0,
    TLE: 0,
    MLE: 0,
    RE: 0,
    CE: 0,
  };

  for (const r of results) {
    if (r.verdict && Object.prototype.hasOwnProperty.call(verdictBreakdown, r.verdict)) {
      verdictBreakdown[r.verdict] += 1;
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const firstFailure = results.find((r) => !r.passed) || null;

  return {
    judgeBackend,
    compilationError: null,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      verdictBreakdown,
      firstFailure: firstFailure
        ? {
            testCaseIndex: firstFailure.testCaseIndex,
            verdict: firstFailure.verdict || "WA",
            reason: firstFailure.stderr || "Wrong output",
          }
        : null,
    },
  };
}

function getQueueStats() {
  return {
    pending: execQueue.pending,
    active: execQueue.active,
    concurrency: JUDGE_CONCURRENCY,
    compareMode: DEFAULT_COMPARE_MODE,
  };
}

module.exports = { judgeQueued, runSamples, getQueueStats };
