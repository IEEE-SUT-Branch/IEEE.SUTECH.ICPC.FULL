const crypto = require("crypto");
const https  = require("https");

// ── Parse Polygon plain-text statement (LaTeX) into structured sections ───────
function parsePolygonStatement(raw) {
  // Common Polygon/Codeforces LaTeX section markers
  const markers = [
    { key: "input",  patterns: [/\\begin\{inputspec\}/i, /\\InputFile/i, /\\input\b/i] },
    { key: "output", patterns: [/\\begin\{outputspec\}/i, /\\OutputFile/i, /\\output\b/i] },
    { key: "notes",  patterns: [/\\begin\{note\}/i, /\\Note\b/i] },
  ];

  // Find earliest marker to decide if splitting is possible
  let splitIndex = raw.length;
  let splitKey   = null;
  for (const { key, patterns } of markers) {
    for (const pat of patterns) {
      const m = pat.exec(raw);
      if (m && m.index < splitIndex) { splitIndex = m.index; splitKey = key; }
    }
  }

  if (!splitKey) {
    // No recognised markers — put everything in legend
    return { legend: raw, input: "", output: "", notes: "" };
  }

  // Crude section split: legend = content before first marker
  const legend = raw.slice(0, splitIndex).trim();

  // Extract input, output, notes using regex
  const extract = (startPats, endPats) => {
    for (const start of startPats) {
      const sm = start.exec(raw);
      if (!sm) continue;
      let end = raw.length;
      for (const ep of endPats) {
        const em = ep.exec(raw.slice(sm.index + sm[0].length));
        if (em) { end = sm.index + sm[0].length + em.index; break; }
      }
      return raw.slice(sm.index + sm[0].length, end).replace(/\\end\{[^}]+\}/g, "").trim();
    }
    return "";
  };

  const input  = extract(
    [/\\begin\{inputspec\}/i, /\\InputFile[^\n]*\n/i],
    [/\\end\{inputspec\}/i, /\\begin\{outputspec\}/i, /\\OutputFile/i, /\\begin\{note\}/i],
  );
  const output = extract(
    [/\\begin\{outputspec\}/i, /\\OutputFile[^\n]*\n/i],
    [/\\end\{outputspec\}/i, /\\begin\{note\}/i, /\\Note\b/i],
  );
  const notes  = extract(
    [/\\begin\{note\}/i, /\\Note\b[^\n]*\n/i],
    [/\\end\{note\}/i],
  );

  return { legend, input, output, notes };
}

// ── Polygon API signature helper ────────────────────────────────────────────
function buildSignedParams(method, extraParams, apiKey, apiSecret) {
  const rand = crypto.randomBytes(3).toString("hex"); // 6 hex chars (lowercase)
  const time = Math.floor(Date.now() / 1000);

  const allParams = { ...extraParams, apiKey, time: String(time) };

  // Sort all params alphabetically and build canonical string
  const sortedStr = Object.keys(allParams)
    .sort()
    .map((k) => `${k}=${allParams[k]}`)
    .join("&");

  // Polygon uses plain SHA-512 (NOT HMAC) — secret is embedded inside the string
  const toSign = `${rand}/${method}?${sortedStr}#${apiSecret}`;
  const sig    = crypto.createHash("sha512").update(toSign).digest("hex");

  return { ...allParams, apiSig: `${rand}${sig}` };
}

// ── Raw HTTPS GET to Polygon (returns parsed JSON) ───────────────────────────
function polygonGet(method, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const options = {
      hostname: "polygon.codeforces.com",
      path:     `/api/${method}?${qs}`,
      method:   "GET",
      headers:  { "User-Agent": "IEEE-SUTECH/1.0" },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try   { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Invalid JSON from Polygon (${method})`)); }
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(new Error(`Polygon API timeout (${method})`)); });
    req.end();
  });
}

// ── Raw text GET to Polygon (for endpoints that return plain text) ────────────
function polygonGetText(method, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const options = {
      hostname: "polygon.codeforces.com",
      path:     `/api/${method}?${qs}`,
      method:   "GET",
      headers:  { "User-Agent": "IEEE-SUTECH/1.0" },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        // If Polygon returns a JSON error, surface it; otherwise return raw text
        try {
          const json = JSON.parse(data);
          if (json.status !== "OK") {
            reject(new Error(json.comment || `Polygon error (${method})`));
          } else {
            resolve(json.result || data);
          }
        } catch {
          // Not JSON — this IS the raw content (test input/output)
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(new Error(`Polygon API timeout (${method})`)); });
    req.end();
  });
}

// ── List problems ────────────────────────────────────────────────────────────
exports.listProblems = async (req, res) => {
  const { apiKey, apiSecret } = req.body;
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ success: false, message: "apiKey and apiSecret are required" });
  }

  try {
    const params = buildSignedParams("problems.list", {}, apiKey, apiSecret);
    const result = await polygonGet("problems.list", params);

    if (result.status !== "OK") {
      return res.status(400).json({ success: false, message: result.comment || "Polygon API error" });
    }

    res.json({ success: true, data: result.result || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Import one problem ───────────────────────────────────────────────────────
exports.importProblem = async (req, res) => {
  const { apiKey, apiSecret, problemId } = req.body;
  if (!apiKey || !apiSecret || !problemId) {
    return res.status(400).json({ success: false, message: "apiKey, apiSecret, and problemId are required" });
  }

  const pid = String(problemId);

  try {
    // ── 1. Basic info (title, time limit, memory limit) ─────────────────────
    const infoParams = buildSignedParams("problem.info", { problemId: pid }, apiKey, apiSecret);
    const infoResult = await polygonGet("problem.info", infoParams);
    if (infoResult.status !== "OK") {
      return res.status(400).json({ success: false, message: infoResult.comment || "Cannot fetch problem info" });
    }
    const info = infoResult.result;

    // ── 2. Statement — problem.statement returns plain text (LaTeX), not JSON ──
    let stmt = null;
    let stmtWarning = null;
    const langOptions = ["english", "russian", "arabic", "en", "ru", "ar"];
    for (const lang of langOptions) {
      try {
        const p = buildSignedParams("problem.statement", { problemId: pid, language: lang }, apiKey, apiSecret);
        const content = await polygonGetText("problem.statement", p);
        if (content && content.trim()) {
          stmt = parsePolygonStatement(content.trim());
          break;
        }
      } catch { /* language not available, try next */ }
    }
    if (!stmt) {
      stmtWarning = "No statement text found in Polygon. Write the statement in Polygon's Statement tab first.";
    } else if (!stmt.legend && !stmt.input && !stmt.output && !stmt.notes) {
      stmtWarning = "Statement found but all sections are empty.";
    }

    // ── 3. Sample tests ──────────────────────────────────────────────────────
    // Polygon default testset is "tests" (NOT "samples")
    const samples = [];
    let testImportWarning = null;
    try {
      const tp = buildSignedParams("problem.tests", { problemId: pid, testset: "tests" }, apiKey, apiSecret);
      const tr = await polygonGet("problem.tests", tp);

      if (tr.status !== "OK") {
        testImportWarning = `Could not fetch tests: ${tr.comment || "unknown error"}`;
      } else if (!Array.isArray(tr.result)) {
        testImportWarning = "Tests response was not in expected format.";
      } else {
        const sampleMeta = tr.result.filter((t) => t.useInStatements);

        if (sampleMeta.length === 0) {
          testImportWarning = "No sample tests found. Make sure tests are marked as 'Use in statements' in Polygon.";
        }

        for (const t of sampleMeta) {
          // Polygon may include answer inline under different field names for manual tests
          let input  = t.input  || t.inputData  || "";
          let answer = t.answer || t.output     || t.expectedOutput || t.outputData || "";

          // For generated tests, content is NOT inline — fetch separately
          if (!input) {
            try {
              const ip = buildSignedParams("problem.testInput",
                { problemId: pid, testset: "tests", testIndex: t.index }, apiKey, apiSecret);
              // problem.testInput may return plain text or JSON — polygonGetText handles both
              input = await polygonGetText("problem.testInput", ip);
            } catch (e) { testImportWarning = `Test #${t.index} input: ${e.message}`; }
          }

          if (!answer) {
            // problem.testOutput returns plain text (not JSON); use polygonGetText
            try {
              const ap = buildSignedParams("problem.testOutput",
                { problemId: pid, testset: "tests", testIndex: t.index }, apiKey, apiSecret);
              answer = await polygonGetText("problem.testOutput", ap);
            } catch (e) {
              testImportWarning = `Test #${t.index} answer: ${e.message}`;
            }
          }

          // Only push if we have at least the input
          if (input) {
            samples.push({ input, expectedOutput: answer, isVisible: true });
          }
        }

        if (samples.length > 0 && samples.some((s) => !s.expectedOutput) && !testImportWarning) {
          testImportWarning = "Sample inputs imported but expected outputs are empty. Check the debug message above or add them manually in the Test Cases tab.";
        }
      }
    } catch (e) {
      testImportWarning = `Tests could not be fetched: ${e.message}`;
    }

    res.json({
      success: true,
      data: {
        title:             info.name                                               || "",
        timeLimitSeconds:  Math.max(1, Math.ceil((info.timeLimit    || 1000) / 1000)),
        memoryLimitMB:     Math.max(16, info.memoryLimit || 256),
        description:       stmt?.legend                                            || "",
        inputDescription:  stmt?.input                                             || "",
        outputDescription: stmt?.output                                            || "",
        notes:             stmt?.notes                                             || "",
        testCases:         samples,
        stmtWarning,
        testImportWarning,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
