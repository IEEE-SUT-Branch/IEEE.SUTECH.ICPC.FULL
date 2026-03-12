const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
  TabStopType,
  TabStopPosition,
} = require("docx");
const fs = require("fs");

// ─── Color Palette ───
const COLORS = {
  primary: "1B4F72",
  secondary: "2E86C1",
  accent: "27AE60",
  warning: "E67E22",
  danger: "E74C3C",
  dark: "2C3E50",
  light: "ECF0F1",
  white: "FFFFFF",
  black: "000000",
  codeBg: "F4F4F4",
  headerBg: "1B4F72",
  get: "27AE60",
  post: "E67E22",
  put: "2E86C1",
  patch: "8E44AD",
  delete: "E74C3C",
};

// ─── Helpers ───
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, color: COLORS.primary })],
  });
}

function h2(text) {
  return heading(text, HeadingLevel.HEADING_2);
}
function h3(text) {
  return heading(text, HeadingLevel.HEADING_3);
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, color: COLORS.dark, ...opts })],
  });
}

function bold(text) {
  return para(text, { bold: true });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, color: COLORS.dark })],
  });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { type: ShadingType.SOLID, color: COLORS.codeBg },
    children: [
      new TextRun({ text, font: "Consolas", size: 20, color: COLORS.dark }),
    ],
  });
}

function codeBlock(lines) {
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: COLORS.codeBg },
        children: [
          new TextRun({
            text: line,
            font: "Consolas",
            size: 18,
            color: COLORS.dark,
          }),
        ],
      })
  );
}

function methodBadge(method, path, description) {
  const colorMap = {
    GET: COLORS.get,
    POST: COLORS.post,
    PUT: COLORS.put,
    PATCH: COLORS.patch,
    DELETE: COLORS.delete,
  };
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [
      new TextRun({
        text: ` ${method} `,
        bold: true,
        color: COLORS.white,
        size: 22,
        shading: {
          type: ShadingType.SOLID,
          color: colorMap[method] || COLORS.dark,
        },
      }),
      new TextRun({
        text: `  ${path}`,
        bold: true,
        font: "Consolas",
        size: 22,
        color: COLORS.dark,
      }),
      new TextRun({
        text: `    ${description}`,
        size: 20,
        color: "777777",
        italics: true,
      }),
    ],
  });
}

function tableCell(text, opts = {}) {
  return new TableCell({
    width: opts.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    shading: opts.header
      ? { type: ShadingType.SOLID, color: COLORS.headerBg }
      : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: !!opts.header,
            color: opts.header ? COLORS.white : COLORS.dark,
            size: opts.header ? 20 : 19,
            font: opts.mono ? "Consolas" : "Calibri",
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows) {
  const colWidth = Math.floor(100 / headers.length);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map((h) =>
          tableCell(h, { header: true, width: colWidth })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell, i) =>
              tableCell(cell, {
                width: colWidth,
                mono: i === 0 || headers[i] === "Type",
              })
            ),
          })
      ),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 200 }, children: [] });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function authNote(type) {
  const map = {
    jwt: "🔒 Requires: Authorization: Bearer <token>",
    "jwt-admin":
      "🔒 Requires: Authorization: Bearer <admin_token>  |  Role: admin",
    "jwt-admin-judge":
      "🔒 Requires: Authorization: Bearer <token>  |  Role: admin or judge",
    "jwt-student":
      "🔒 Requires: Authorization: Bearer <student_token>  |  Role: student",
    apikey: "🔑 Requires: x-api-key header",
    none: "🌐 No authentication required",
  };
  return new Paragraph({
    spacing: { after: 100 },
    shading: { type: ShadingType.SOLID, color: "FFF3E0" },
    children: [
      new TextRun({
        text: map[type] || type,
        size: 19,
        color: COLORS.warning,
        italics: true,
      }),
    ],
  });
}

function jsonBlock(obj) {
  const lines = JSON.stringify(obj, null, 2).split("\n");
  return codeBlock(lines);
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ═══════════════════════════════════════════════════════════

const sections = [];

// ─── TITLE PAGE ───
sections.push(
  new Paragraph({
    spacing: { before: 4000 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "SUTech ECPC Platform",
        bold: true,
        size: 56,
        color: COLORS.primary,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "Complete API Documentation",
        size: 36,
        color: COLORS.secondary,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: "For Frontend Development Team",
        size: 28,
        color: COLORS.dark,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [
      new TextRun({
        text: `Prepared by: Backend Team — IEEE SUTech`,
        size: 22,
        color: "777777",
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: `Date: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        size: 22,
        color: "777777",
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Version 1.0", size: 22, color: "777777" })],
  }),
  spacer(),
  makeTable(
    ["Info", "Value"],
    [
      ["Base URL (Local)", "http://localhost:3000/api"],
      ["Base URL (Production)", "https://sutech-ecpc-platform.vercel.app/api"],
      ["Total Endpoints", "52"],
      ["Auth Methods", "JWT Bearer Token + x-api-key"],
      ["Real-time", "Socket.io (local) / Polling (Vercel)"],
    ]
  ),
  pageBreak()
);

// ─── TABLE OF CONTENTS ───
sections.push(
  heading("Table of Contents"),
  ...[
    "1. Authentication Overview",
    "2. Auth Endpoints",
    "3. Contest Management",
    "4. Problem Management",
    "5. Submissions & Judging",
    "6. Live Standings",
    "7. Student Monitoring",
    "8. Anti-Cheat System",
    "9. Code Auto-Save",
    "10. Email Automation (x-api-key)",
    "11. WebSocket Events",
    "12. Error Handling",
    "13. Enums & Constants",
    "14. Mock Data",
  ].map((t) => bullet(t)),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 1. AUTHENTICATION OVERVIEW
// ═══════════════════════════════════════════════════
sections.push(
  heading("1. Authentication Overview"),
  para("The platform uses two authentication mechanisms:"),
  spacer(),
  h3("1.1 JWT Bearer Token (Contest System)"),
  para(
    "Used for all contest-related endpoints. After login, include the token in every request:"
  ),
  code("Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."),
  spacer(),
  makeTable(
    ["Role", "Login Endpoint", "Credentials", "Access Level"],
    [
      [
        "student",
        "POST /auth/student/login",
        "email + universityId",
        "Own submissions, problems, code-save, anti-cheat reporting",
      ],
      [
        "admin",
        "POST /auth/admin/login",
        "username + password",
        "Full access to everything",
      ],
      [
        "judge",
        "POST /auth/admin/login",
        "username + password",
        "Problems, submissions, monitoring, standings (no contest create/delete)",
      ],
    ]
  ),
  spacer(),
  h3("1.2 API Key (Email System)"),
  para("Used only for email automation endpoints. Include in header:"),
  code("x-api-key: your_admin_api_key"),
  spacer(),
  h3("1.3 Token Lifecycle"),
  makeTable(
    ["Token", "Expiration", "Usage"],
    [
      ["accessToken", "2 hours", "Send with every request"],
      [
        "refreshToken",
        "7 days",
        "Use POST /auth/refresh to get new accessToken",
      ],
    ]
  ),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 2. AUTH ENDPOINTS
// ═══════════════════════════════════════════════════
sections.push(
  heading("2. Auth Endpoints"),
  para("Base path: /api/auth"),
  spacer(),

  // Student Login
  methodBadge("POST", "/api/auth/student/login", "Student Login"),
  authNote("none"),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      [
        "email",
        "string",
        "✓",
        "Student university email (e.g., ahmed@sut.edu.eg)",
      ],
      [
        "universityId",
        "string",
        "✓",
        "Student university ID (e.g., SUT2026001)",
      ],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({
    email: "ahmed.hassan@sut.edu.eg",
    universityId: "SUT2026001",
  }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Login successful",
    data: {
      student: {
        _id: "65e3a1b2c4f5d6e7f8a9b0c1",
        fullName: "Ahmed Hassan Mohamed",
        email: "ahmed.hassan@sut.edu.eg",
        labAssignment: "Lab 5",
        testGroup: "Sunday",
      },
      accessToken: "eyJhbGciOiJIUzI1NiIs...",
      refreshToken: "eyJhbGciOiJIUzI1NiIs...",
    },
  }),
  bold("Error 401:"),
  ...jsonBlock({ success: false, message: "Invalid credentials" }),
  bold("Error 403 (Disqualified):"),
  ...jsonBlock({ success: false, message: "You have been disqualified" }),
  spacer(),

  // Admin Login
  methodBadge("POST", "/api/auth/admin/login", "Admin / Judge Login"),
  authNote("none"),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      ["username", "string", "✓", "Admin username"],
      ["password", "string", "✓", "Admin password"],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({ username: "admin", password: "admin123" }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Admin login successful",
    data: {
      admin: {
        _id: "65e3a1b2...",
        username: "admin",
        fullName: "System Admin",
        role: "admin",
      },
      accessToken: "eyJhbG...",
      refreshToken: "eyJhbG...",
    },
  }),
  spacer(),

  // Refresh
  methodBadge("POST", "/api/auth/refresh", "Refresh Access Token"),
  authNote("none"),
  bold("Request Body:"),
  ...jsonBlock({ refreshToken: "eyJhbGciOiJIUzI1NiIs..." }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: { accessToken: "eyJhbG..._new", refreshToken: "eyJhbG..._new" },
  }),
  spacer(),

  // Me
  methodBadge("GET", "/api/auth/me", "Get Current User Info"),
  authNote("jwt"),
  bold("Response 200 (Student):"),
  ...jsonBlock({
    success: true,
    data: {
      id: "65e3...",
      role: "student",
      email: "ahmed@sut.edu.eg",
      fullName: "Ahmed Hassan",
      lab: "Lab 5",
      group: "Sunday",
    },
  }),
  bold("Response 200 (Admin):"),
  ...jsonBlock({
    success: true,
    data: {
      id: "65e3...",
      role: "admin",
      username: "admin",
      fullName: "System Admin",
    },
  }),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 3. CONTEST MANAGEMENT
// ═══════════════════════════════════════════════════
sections.push(
  heading("3. Contest Management"),
  para("Base path: /api/contests — All endpoints require JWT authentication."),
  spacer(),
  h3("Contest State Machine"),
  code("not_started  →  running  →  paused  →  running  →  ended"),
  para("Only one contest can be in 'running' state at a time."),
  spacer(),

  // Create
  methodBadge("POST", "/api/contests", "Create Contest"),
  authNote("jwt-admin"),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Default", "Description"],
    [
      ["title", "string", "✓", "—", "Contest title"],
      ["description", "string", "✗", '""', "Contest description"],
      ["durationMinutes", "number", "✗", "60", "Contest duration in minutes"],
      [
        "allowedLanguages",
        "string[]",
        "✗",
        '["cpp","python","java"]',
        "Allowed programming languages",
      ],
      [
        "type",
        "string",
        "✗",
        '"placement"',
        "Contest type: placement or final",
      ],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({
    title: "Placement Test 2026",
    durationMinutes: 60,
    type: "placement",
  }),
  bold("Response 201:"),
  ...jsonBlock({
    success: true,
    data: {
      _id: "65f1a2b3c4d5e6f7a8b9c0d1",
      title: "Placement Test 2026",
      status: "not_started",
      durationMinutes: 60,
      allowedLanguages: ["cpp", "python", "java"],
      type: "placement",
      startedAt: null,
      totalPausedMs: 0,
      createdAt: "2026-03-08T10:00:00.000Z",
    },
  }),
  spacer(),

  // List
  methodBadge("GET", "/api/contests", "List All Contests"),
  authNote("jwt"),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: [
      {
        _id: "65f1a2b3...",
        title: "Placement Test 2026",
        status: "running",
        durationMinutes: 60,
      },
    ],
  }),
  spacer(),

  // Get Single
  methodBadge("GET", "/api/contests/:id", "Get Contest by ID"),
  authNote("jwt"),
  bold("Response 200:"),
  para("Returns full contest object (same shape as create response)."),
  spacer(),

  // Update
  methodBadge("PUT", "/api/contests/:id", "Update Contest"),
  authNote("jwt-admin"),
  para("Cannot update a running contest. Send any fields to update."),
  bold("Request Example:"),
  ...jsonBlock({ title: "Updated Title", durationMinutes: 90 }),
  spacer(),

  // Active
  methodBadge("GET", "/api/contests/active", "Get Active Contest"),
  authNote("jwt"),
  para("Returns the currently running or paused contest, or null if none."),
  bold("Response 200 (active):"),
  ...jsonBlock({
    success: true,
    data: {
      _id: "65f1a2b3...",
      title: "Placement Test",
      status: "running",
      startedAt: "2026-03-08T14:00:00.000Z",
    },
  }),
  bold("Response 200 (none):"),
  ...jsonBlock({ success: true, data: null, message: "No active contest" }),
  spacer(),

  // Start
  methodBadge("POST", "/api/contests/:id/start", "Start Contest"),
  authNote("jwt-admin"),
  para("Transitions: not_started → running. Sets startedAt to current time."),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Contest started",
    data: {
      _id: "65f1...",
      status: "running",
      startedAt: "2026-03-08T14:00:00.000Z",
    },
  }),
  spacer(),

  // Pause
  methodBadge("POST", "/api/contests/:id/pause", "Pause Contest"),
  authNote("jwt-admin"),
  para("Freezes all timers. Students cannot submit. Use for lab emergencies."),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Contest paused",
    data: { status: "paused" },
  }),
  spacer(),

  // Resume
  methodBadge("POST", "/api/contests/:id/resume", "Resume Contest"),
  authNote("jwt-admin"),
  para(
    "Resumes from paused. Calculates totalPausedMs so students don't lose time."
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Contest resumed",
    data: { status: "running", totalPausedMs: 120000 },
  }),
  spacer(),

  // End
  methodBadge("POST", "/api/contests/:id/end", "End Contest"),
  authNote("jwt-admin"),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Contest ended",
    data: { status: "ended", endedAt: "2026-03-08T15:00:00.000Z" },
  }),
  spacer(),

  // Timer
  methodBadge("GET", "/api/contests/:id/timer", "Get Contest Timer"),
  authNote("jwt"),
  para("Server-side timer calculation. Use this for the countdown display."),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: {
      status: "running",
      serverTime: 1709906400000,
      startedAt: "2026-03-08T14:00:00.000Z",
      durationMinutes: 60,
      totalPausedMs: 0,
      elapsedMs: 1200000,
      remainingMs: 2400000,
    },
  }),
  spacer(),

  // Extend Time
  methodBadge(
    "POST",
    "/api/contests/:id/extend-time",
    "Extend Time for Student"
  ),
  authNote("jwt-admin-judge"),
  para("Grants bonus time to a specific student (e.g., after machine crash)."),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      ["studentId", "string", "✓", "MongoDB _id of the student"],
      ["extraMinutes", "number", "✓", "Minutes to add"],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({ studentId: "65e3a1b2c4f5d6e7f8a9b0c1", extraMinutes: 5 }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Added 5 minutes to Ahmed Hassan",
    data: { totalBonusSeconds: 300 },
  }),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 4. PROBLEM MANAGEMENT
// ═══════════════════════════════════════════════════
sections.push(
  heading("4. Problem Management"),
  para("Base path: /api/problems — All endpoints require JWT authentication."),
  spacer(),

  // Student Problems
  methodBadge(
    "GET",
    "/api/problems/contest",
    "Get Contest Problems (Student View)"
  ),
  authNote("jwt"),
  para(
    "Returns only published problems. Hidden test cases are stripped — students only see visible (sample) test cases."
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: [
      {
        _id: "65f2...",
        letter: "A",
        title: "A + B",
        description: "Print the sum of two numbers",
        inputDescription: "Two integers a and b",
        outputDescription: "Their sum",
        timeLimitSeconds: 2,
        memoryLimitMB: 256,
        difficulty: "easy",
        testCases: [
          { _id: "tc1", input: "1 2", expectedOutput: "3", isVisible: true },
          { _id: "tc2", input: "10 20", expectedOutput: "30", isVisible: true },
        ],
      },
    ],
  }),
  spacer(),

  // Student Single Problem
  methodBadge(
    "GET",
    "/api/problems/contest/:letter",
    "Get Single Problem by Letter"
  ),
  authNote("jwt"),
  para(
    "Same response shape as above but filtered to a single problem. Example: /api/problems/contest/A"
  ),
  spacer(),

  // Create Problem
  methodBadge("POST", "/api/problems", "Create Problem"),
  authNote("jwt-admin-judge"),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Default", "Description"],
    [
      ["contestId", "string", "✓", "—", "Contest this problem belongs to"],
      ["letter", "string", "✓", "—", "Problem letter (A, B, C, D, E)"],
      ["title", "string", "✓", "—", "Problem title"],
      [
        "description",
        "string",
        "✗",
        '""',
        "Full problem statement (Markdown/HTML)",
      ],
      ["inputDescription", "string", "✗", '""', "Input format description"],
      ["outputDescription", "string", "✗", '""', "Output format description"],
      ["timeLimitSeconds", "number", "✗", "1", "Time limit per test case"],
      ["memoryLimitMB", "number", "✗", "256", "Memory limit"],
      ["difficulty", "string", "✗", '"easy"', "easy | medium | hard"],
      ["order", "number", "✗", "0", "Display order"],
      ["testCases", "array", "✗", "[]", "Array of test case objects"],
    ]
  ),
  bold("Test Case Object:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      ["input", "string", "✓", "Input data for this test case"],
      ["expectedOutput", "string", "✓", "Expected correct output"],
      [
        "isVisible",
        "boolean",
        "✗",
        "false = hidden (system test), true = sample (shown to student)",
      ],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({
    contestId: "65f1a2b3c4d5e6f7a8b9c0d1",
    letter: "A",
    title: "A + B",
    description: "Given two integers, print their sum.",
    inputDescription: "Two space-separated integers a and b (1 ≤ a, b ≤ 10^9)",
    outputDescription: "A single integer — the sum of a and b",
    timeLimitSeconds: 2,
    difficulty: "easy",
    order: 1,
    testCases: [
      { input: "1 2", expectedOutput: "3", isVisible: true },
      { input: "10 20", expectedOutput: "30", isVisible: true },
      { input: "999999999 1", expectedOutput: "1000000000", isVisible: false },
    ],
  }),
  bold("Response 201:"),
  para(
    "Returns the created problem with all fields including _id and status: 'draft'."
  ),
  spacer(),

  // List All
  methodBadge("GET", "/api/problems", "List All Problems"),
  authNote("jwt"),
  para("Returns all problems (including hidden test cases for admins)."),
  spacer(),

  // Get Single
  methodBadge("GET", "/api/problems/:id", "Get Problem by ID"),
  authNote("jwt"),
  spacer(),

  // Update
  methodBadge("PUT", "/api/problems/:id", "Update Problem"),
  authNote("jwt-admin-judge"),
  para("Send any fields to update. Same request shape as create."),
  spacer(),

  // Delete
  methodBadge("DELETE", "/api/problems/:id", "Delete Problem"),
  authNote("jwt-admin"),
  bold("Response 200:"),
  ...jsonBlock({ success: true, message: "Problem deleted" }),
  spacer(),

  // Publish
  methodBadge("PATCH", "/api/problems/:id/publish", "Publish Problem"),
  authNote("jwt-admin-judge"),
  para(
    "Changes status from 'draft' to 'published'. Students can only see published problems."
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: { _id: "65f2...", status: "published" },
  }),
  spacer(),

  // Add Test Case
  methodBadge("POST", "/api/problems/:id/test-cases", "Add Test Case"),
  authNote("jwt-admin-judge"),
  bold("Request Body:"),
  ...jsonBlock({ input: "5 3", expectedOutput: "8", isVisible: false }),
  spacer(),

  // Bulk Upload
  methodBadge(
    "POST",
    "/api/problems/:id/test-cases/bulk-upload",
    "Bulk Upload Test Cases"
  ),
  authNote("jwt-admin-judge"),
  para(
    "Upload multiple test cases at once via file upload (.in/.out files) or JSON array."
  ),
  spacer(),

  // Update Test Case
  methodBadge("PUT", "/api/problems/:id/test-cases/:tcId", "Update Test Case"),
  authNote("jwt-admin-judge"),
  bold("Request Body:"),
  ...jsonBlock({ input: "100 200", expectedOutput: "300", isVisible: true }),
  spacer(),

  // Delete Test Case
  methodBadge(
    "DELETE",
    "/api/problems/:id/test-cases/:tcId",
    "Delete Test Case"
  ),
  authNote("jwt-admin-judge"),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 5. SUBMISSIONS & JUDGING
// ═══════════════════════════════════════════════════
sections.push(
  heading("5. Submissions & Judging"),
  para(
    "Base path: /api/submissions — All endpoints require JWT authentication."
  ),
  spacer(),
  h3("5.1 Rate Limiting"),
  para(
    "Students must wait 10 seconds between submissions. Exceeding this returns 429."
  ),
  spacer(),
  h3("5.2 Contest Guard"),
  para(
    "Submit and Run endpoints require an active (running) contest. If no contest is running, paused, or student is disqualified → 403."
  ),
  spacer(),

  // Submit
  methodBadge("POST", "/api/submissions", "Submit Solution (Official)"),
  authNote("jwt-student"),
  para(
    "⚠️ Requires contest guard + rate limiter. Runs code against ALL test cases (visible + hidden)."
  ),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      ["problemId", "string", "✓", "MongoDB _id of the problem"],
      ["code", "string", "✓", "The complete source code"],
      ["language", "string", "✓", "cpp | python | java"],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({
    problemId: "65f2a3b4c5d6e7f8a9b0c1d2",
    code: "a, b = map(int, input().split())\nprint(a + b)",
    language: "python",
  }),
  bold("Response 202 (Queued):"),
  ...jsonBlock({
    success: true,
    message: "Submission queued for judging",
    data: { submissionId: "65f3b4c5d6e7f8a9b0c1d2e3", verdict: "queued" },
  }),
  para(
    "⚠️ IMPORTANT: The response returns immediately with verdict 'queued'. Judging happens in the background. To get the final verdict:"
  ),
  bullet("Option A: Listen for WebSocket event 'submission:verdict'"),
  bullet("Option B: Poll GET /api/submissions/my every 3-5 seconds"),
  spacer(),

  // Run
  methodBadge("POST", "/api/submissions/run", "Run Code (Debug / Sample Test)"),
  authNote("jwt-student"),
  para(
    "Runs code against ONLY visible (sample) test cases. No submission is recorded. Used for the 'Run Code' button."
  ),
  bold("Request Body:"),
  para("Same as Submit: { problemId, code, language }"),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: {
      compilationError: null,
      results: [
        {
          input: "1 2",
          expectedOutput: "3",
          actualOutput: "3",
          passed: true,
          stderr: "",
        },
        {
          input: "10 20",
          expectedOutput: "30",
          actualOutput: "30",
          passed: true,
          stderr: "",
        },
      ],
    },
  }),
  bold("Response 200 (Compilation Error):"),
  ...jsonBlock({
    success: true,
    data: {
      compilationError: "solution.cpp:3:5: error: expected ';' before 'return'",
      results: [],
    },
  }),
  spacer(),

  // My Submissions
  methodBadge("GET", "/api/submissions/my", "Get My Submissions"),
  authNote("jwt"),
  para(
    "Returns all submissions by the authenticated student, sorted by newest first."
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: [
      {
        _id: "65f3b4c5...",
        problemId: { _id: "65f2...", letter: "A", title: "A + B" },
        code: "a, b = map(int, input().split())\nprint(a + b)",
        language: "python",
        verdict: "AC",
        isAccepted: true,
        submittedAt: "2026-03-08T14:15:00.000Z",
        judgedAt: "2026-03-08T14:15:03.000Z",
        testCaseResults: [
          { passed: true, stderr: "" },
          { passed: true, stderr: "" },
          { passed: true, stderr: "" },
        ],
        elapsedMinutesFromStart: 15,
      },
    ],
  }),
  spacer(),

  // My Submissions by Problem
  methodBadge(
    "GET",
    "/api/submissions/my/:problemLetter",
    "Get My Submissions for Problem"
  ),
  authNote("jwt"),
  para(
    "Filter own submissions by problem letter. Example: /api/submissions/my/A"
  ),
  spacer(),

  // List All (Admin)
  methodBadge("GET", "/api/submissions", "List All Submissions (Admin)"),
  authNote("jwt-admin-judge"),
  bold("Query Parameters:"),
  makeTable(
    ["Param", "Type", "Description"],
    [
      ["contestId", "string", "Filter by contest"],
      ["studentId", "string", "Filter by student"],
      ["verdict", "string", "Filter by verdict (AC, WA, TLE, CE, RE)"],
      ["language", "string", "Filter by language"],
      ["limit", "number", "Max results (default: 200)"],
    ]
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    count: 45,
    data: [
      {
        _id: "65f3...",
        studentId: {
          _id: "65e3...",
          fullName: "Ahmed Hassan",
          universityId: "SUT2026001",
          labAssignment: "Lab 5",
        },
        problemId: { _id: "65f2...", letter: "A", title: "A + B" },
        code: "print(int(input()) + int(input()))",
        language: "python",
        verdict: "WA",
        isAccepted: false,
        submittedAt: "2026-03-08T14:20:00.000Z",
      },
    ],
  }),
  spacer(),

  // Get One (Admin)
  methodBadge("GET", "/api/submissions/:id", "Get Single Submission (Admin)"),
  authNote("jwt-admin-judge"),
  para(
    "Returns full submission including the code. Used for manual code review."
  ),
  spacer(),

  h3("5.3 Verdict Reference"),
  makeTable(
    ["Verdict", "Code", "Meaning"],
    [
      ["Accepted", "AC", "All test cases passed"],
      ["Wrong Answer", "WA", "Output doesn't match expected"],
      ["Time Limit Exceeded", "TLE", "Code ran longer than allowed"],
      ["Compilation Error", "CE", "Code failed to compile"],
      ["Runtime Error", "RE", "Code crashed during execution"],
      ["Memory Limit Exceeded", "MLE", "Code used too much memory"],
      ["Queued", "queued", "Waiting to be judged"],
      ["Judging", "judging", "Currently being evaluated"],
    ]
  ),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 6. LIVE STANDINGS
// ═══════════════════════════════════════════════════
sections.push(
  heading("6. Live Standings"),
  para(
    "Base path: /api/standings — ICPC-style scoreboard computed from all submissions."
  ),
  spacer(),
  h3("6.1 Scoring Rules"),
  bullet("Primary sort: Total problems solved (descending)"),
  bullet("Secondary sort: Total penalty time (ascending)"),
  bullet(
    "Penalty = time of AC submission (in minutes from contest start) + 20 min per wrong attempt before AC"
  ),
  spacer(),

  // Get Standings
  methodBadge("GET", "/api/standings", "Get Live Standings"),
  authNote("jwt"),
  bold("Query Parameters:"),
  makeTable(
    ["Param", "Type", "Description"],
    [
      [
        "contestId",
        "string",
        "Specific contest (default: latest running/ended)",
      ],
      ["lab", "string", "Filter: 'Lab 5', 'Lab 6', 'Lab 7'"],
      ["group", "string", "Filter: 'Sunday', 'Wednesday'"],
      ["minSolved", "number", "Filter: minimum problems solved"],
    ]
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    contestId: "65f1...",
    contestStatus: "running",
    count: 75,
    data: [
      {
        rank: 1,
        studentId: "65e3a1b2c4f5d6e7f8a9b0c1",
        fullName: "Ahmed Hassan Mohamed",
        universityId: "SUT2026001",
        labAssignment: "Lab 5",
        testGroup: "Sunday",
        totalSolved: 4,
        totalPenalty: 125,
        isDisqualified: false,
        problems: {
          A: { solved: true, attempts: 0, acceptedAt: 8, penaltyMinutes: 8 },
          B: { solved: true, attempts: 1, acceptedAt: 25, penaltyMinutes: 45 },
          C: { solved: true, attempts: 0, acceptedAt: 35, penaltyMinutes: 35 },
          D: { solved: true, attempts: 2, acceptedAt: 52, penaltyMinutes: 92 },
          E: {
            solved: false,
            attempts: 3,
            acceptedAt: null,
            penaltyMinutes: 0,
          },
        },
      },
    ],
  }),
  spacer(),

  // Export CSV
  methodBadge("GET", "/api/standings/export", "Export Standings as CSV"),
  authNote("jwt-admin-judge"),
  para("Downloads a CSV file. Response Content-Type: text/csv"),
  bold("CSV Columns:"),
  code("Rank,Name,University ID,Lab,Group,Solved,Penalty,Disqualified"),
  spacer(),

  // Student Stats
  methodBadge(
    "GET",
    "/api/standings/student/:id",
    "Get Individual Student Stats"
  ),
  authNote("jwt"),
  para(
    "Returns a single student's standing entry. Use for student's own dashboard."
  ),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 7. STUDENT MONITORING
// ═══════════════════════════════════════════════════
sections.push(
  heading("7. Student Monitoring (Lab Grid)"),
  para(
    "Base path: /api/monitor — Admin/Judge only. Used to build the lab monitoring dashboard."
  ),
  spacer(),

  // Overview
  methodBadge("GET", "/api/monitor/overview", "Dashboard Overview"),
  authNote("jwt-admin-judge"),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: {
      contest: { id: "65f1...", title: "Placement Test", status: "running" },
      totalStudents: 150,
      onlineCount: 72,
      totalSubmissions: 245,
      totalAccepted: 89,
      judgeQueue: { pending: 3, active: 2 },
      recentAlerts: [
        {
          _id: "65f4...",
          studentId: {
            _id: "65e3...",
            fullName: "Mohamed Ali",
            labAssignment: "Lab 6",
          },
          eventType: "tab_switch",
          details: "Switched to another tab",
          createdAt: "2026-03-08T14:25:00.000Z",
        },
      ],
    },
  }),
  spacer(),

  // Students
  methodBadge("GET", "/api/monitor/students", "Get All Student Statuses"),
  authNote("jwt-admin-judge"),
  bold("Query Parameters:"),
  makeTable(
    ["Param", "Type", "Values"],
    [
      ["lab", "string", "'Lab 5', 'Lab 6', 'Lab 7'"],
      ["status", "string", "'online', 'idle', 'offline', 'flagged'"],
      ["group", "string", "'Sunday', 'Wednesday'"],
    ]
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    count: 150,
    data: [
      {
        _id: "65e3a1b2...",
        fullName: "Ahmed Hassan Mohamed",
        universityId: "SUT2026001",
        labAssignment: "Lab 5",
        testGroup: "Sunday",
        status: "online",
        isDisqualified: false,
        warningCount: 0,
        lastHeartbeat: 1709906400000,
      },
      {
        _id: "65e3a1b3...",
        fullName: "Sara Ali Ibrahim",
        universityId: "SUT2026002",
        labAssignment: "Lab 6",
        testGroup: "Sunday",
        status: "flagged",
        isDisqualified: false,
        warningCount: 2,
        lastHeartbeat: 1709906350000,
      },
    ],
  }),
  spacer(),
  h3("Status Indicators"),
  makeTable(
    ["Status", "Icon", "Condition"],
    [
      ["online", "🟢", "Heartbeat received within last 30 seconds"],
      ["idle", "🟡", "Connected but tab switched / lost focus"],
      ["offline", "🔴", "No heartbeat (disconnected or logged out)"],
      ["flagged", "🚩", "Anti-cheat flag triggered"],
    ]
  ),
  spacer(),

  // Labs
  methodBadge("GET", "/api/monitor/labs", "Get Lab Summary"),
  authNote("jwt-admin-judge"),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: {
      "Lab 5": { total: 50, online: 45, idle: 3, offline: 1, flagged: 1 },
      "Lab 6": { total: 50, online: 42, idle: 5, offline: 2, flagged: 1 },
      "Lab 7": { total: 50, online: 48, idle: 1, offline: 1, flagged: 0 },
    },
  }),
  spacer(),

  // Warn
  methodBadge(
    "POST",
    "/api/monitor/warn/:studentId",
    "Send Warning to Student"
  ),
  authNote("jwt-admin-judge"),
  bold("Request Body:"),
  ...jsonBlock({
    message: "This is your first warning. Stay on the contest tab.",
  }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Warning sent to Ahmed Hassan",
    warningCount: 1,
  }),
  para("⚡ WebSocket: Pushes 'admin:warning' event to the student's screen."),
  spacer(),

  // Penalize
  methodBadge(
    "POST",
    "/api/monitor/penalize/:studentId",
    "Add Penalty to Student"
  ),
  authNote("jwt-admin-judge"),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      ["minutes", "number", "✓", "Penalty minutes to add"],
      ["reason", "string", "✗", "Reason for penalty"],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({ minutes: 10, reason: "Switched tabs multiple times" }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "10 min penalty added to Ahmed Hassan",
  }),
  spacer(),

  // Disqualify
  methodBadge(
    "POST",
    "/api/monitor/disqualify/:studentId",
    "Disqualify Student"
  ),
  authNote("jwt-admin-judge"),
  bold("Request Body:"),
  ...jsonBlock({ reason: "Caught using external resources" }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Ahmed Hassan has been disqualified",
  }),
  para(
    "⚡ WebSocket: Pushes 'session:disqualified' event. Frontend should immediately log the student out."
  ),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 8. ANTI-CHEAT SYSTEM
// ═══════════════════════════════════════════════════
sections.push(
  heading("8. Anti-Cheat System"),
  para(
    "Base path: /api/anticheat — Handles cheat detection, logging, and plagiarism checking."
  ),
  spacer(),

  // Report Event
  methodBadge(
    "POST",
    "/api/anticheat/event",
    "Report Anti-Cheat Event (Student Client)"
  ),
  authNote("jwt"),
  para(
    "The frontend must call this whenever it detects suspicious browser behavior."
  ),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      ["eventType", "string", "✓", "Type of event (see enum below)"],
      ["details", "string", "✗", "Additional context"],
    ]
  ),
  bold("Event Types Enum:"),
  makeTable(
    ["Value", "When to Report"],
    [
      ["tab_switch", "document.visibilitychange fires (hidden)"],
      ["fullscreen_exit", "document.fullscreenchange fires (not fullscreen)"],
      ["paste_attempt", "paste event detected in code editor"],
      ["copy_attempt", "copy event detected"],
      ["idle_timeout", "No keyboard/mouse activity for 2+ minutes"],
    ]
  ),
  bold("Request Examples:"),
  ...jsonBlock({
    eventType: "tab_switch",
    details: "Switched to another tab at 14:25",
  }),
  ...jsonBlock({
    eventType: "paste_attempt",
    details: "Attempted to paste 500 characters",
  }),
  bold("Response 200:"),
  ...jsonBlock({ success: true, message: "Event logged" }),
  para(
    "⚡ WebSocket: Immediately broadcasts 'anticheat:alert' to all admin dashboards."
  ),
  spacer(),

  // Get Logs
  methodBadge("GET", "/api/anticheat/logs", "Get All Anti-Cheat Logs"),
  authNote("jwt-admin-judge"),
  bold("Query Parameters:"),
  makeTable(
    ["Param", "Type", "Description"],
    [
      ["studentId", "string", "Filter by student"],
      ["eventType", "string", "Filter by event type"],
      ["contestId", "string", "Filter by contest"],
      ["limit", "number", "Max results (default: 500)"],
    ]
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    count: 12,
    data: [
      {
        _id: "65f4a5b6...",
        studentId: {
          _id: "65e3...",
          fullName: "Mohamed Ali",
          universityId: "SUT2026005",
          labAssignment: "Lab 6",
        },
        contestId: "65f1...",
        eventType: "tab_switch",
        details: "Switched to another tab",
        acknowledged: false,
        createdAt: "2026-03-08T14:25:00.000Z",
      },
    ],
  }),
  spacer(),

  // Student Logs
  methodBadge(
    "GET",
    "/api/anticheat/logs/:studentId",
    "Get Logs for Specific Student"
  ),
  authNote("jwt-admin-judge"),
  spacer(),

  // Acknowledge
  methodBadge(
    "PATCH",
    "/api/anticheat/logs/:id/acknowledge",
    "Acknowledge Alert"
  ),
  authNote("jwt-admin-judge"),
  para("Marks an alert as reviewed/acknowledged by the admin."),
  bold("Response 200:"),
  ...jsonBlock({ success: true, data: { _id: "65f4...", acknowledged: true } }),
  spacer(),

  // Plagiarism Check
  methodBadge(
    "POST",
    "/api/anticheat/plagiarism-check",
    "Run Plagiarism Check"
  ),
  authNote("jwt-admin"),
  para(
    "Compares all AC submissions for a contest to find suspiciously similar code (>85% similarity)."
  ),
  bold("Request Body:"),
  ...jsonBlock({ contestId: "65f1a2b3c4d5e6f7a8b9c0d1" }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    message: "Found 2 suspicious pairs",
    data: [
      {
        problem: "A",
        student1: { id: "65e3...", name: "Ahmed Hassan" },
        student2: { id: "65e4...", name: "Mohamed Ali" },
        similarity: "92%",
        submissionIds: ["65f3...", "65f4..."],
      },
    ],
  }),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 9. CODE AUTO-SAVE
// ═══════════════════════════════════════════════════
sections.push(
  heading("9. Code Auto-Save (State Persistence)"),
  para(
    "Base path: /api/code-save — Allows students to recover their work after disconnection or crash."
  ),
  spacer(),
  h3("Frontend Implementation:"),
  bullet("Auto-save every 30 seconds (or on every keystroke with debounce)"),
  bullet(
    "On page load / reconnection, call restore to get the last saved code"
  ),
  spacer(),

  // Save
  methodBadge("POST", "/api/code-save", "Save Code (Auto-save)"),
  authNote("jwt"),
  bold("Request Body:"),
  makeTable(
    ["Field", "Type", "Required", "Description"],
    [
      ["problemId", "string", "✓", "Problem being worked on"],
      ["code", "string", "✗", "Current code in editor"],
      ["language", "string", "✗", "Current language selected (default: cpp)"],
      ["cursorPosition", "object", "✗", "{ line: number, column: number }"],
    ]
  ),
  bold("Request Example:"),
  ...jsonBlock({
    problemId: "65f2a3b4c5d6e7f8a9b0c1d2",
    code: "a, b = map(int, input().split())\nprint(a + b)",
    language: "python",
    cursorPosition: { line: 2, column: 14 },
  }),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: {
      _id: "65f5b6c7...",
      studentId: "65e3...",
      problemId: "65f2...",
      contestId: "65f1...",
      code: "a, b = map(int, input().split())\nprint(a + b)",
      language: "python",
      cursorPosition: { line: 2, column: 14 },
      savedAt: "2026-03-08T14:30:00.000Z",
    },
  }),
  spacer(),

  // Restore Single
  methodBadge(
    "GET",
    "/api/code-save/:problemId",
    "Restore Saved Code for Problem"
  ),
  authNote("jwt"),
  para(
    "Returns the last saved code for a specific problem. Returns null if nothing saved."
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: {
      _id: "65f5...",
      code: "a, b = map(int, input().split())\nprint(a + b)",
      language: "python",
      cursorPosition: { line: 2, column: 14 },
      savedAt: "2026-03-08T14:30:00.000Z",
    },
  }),
  bold("Response 200 (nothing saved):"),
  ...jsonBlock({ success: true, data: null }),
  spacer(),

  // Restore All
  methodBadge("GET", "/api/code-save/all", "Restore All Saved Code"),
  authNote("jwt"),
  para(
    "Returns saved code for all problems. Use on reconnection to restore the entire editor state."
  ),
  bold("Response 200:"),
  ...jsonBlock({
    success: true,
    data: [
      {
        problemId: "65f2...",
        code: "print(a+b)",
        language: "python",
        savedAt: "2026-03-08T14:30:00.000Z",
      },
      {
        problemId: "65f3...",
        code: "#include<bits/stdc++.h>...",
        language: "cpp",
        savedAt: "2026-03-08T14:28:00.000Z",
      },
    ],
  }),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 10. EMAIL AUTOMATION
// ═══════════════════════════════════════════════════
sections.push(
  heading("10. Email Automation (Legacy System)"),
  para(
    "These endpoints use x-api-key authentication (not JWT). They are used for sending placement test credentials."
  ),
  spacer(),
  para("Authentication: x-api-key: your_admin_api_key"),
  spacer(),

  methodBadge("GET", "/api/health", "Health Check"),
  authNote("none"),
  ...jsonBlock({
    success: true,
    message: "SUTech Platform is running",
    timestamp: "2026-03-08T10:00:00.000Z",
  }),
  spacer(),

  methodBadge("POST", "/api/students/upload-csv", "Import Students from CSV"),
  authNote("apikey"),
  para("Content-Type: multipart/form-data. Field: 'file' (CSV, max 5MB)"),
  para("CSV Columns: fullName, universityId, email, labAssignment, testGroup"),
  spacer(),

  methodBadge("GET", "/api/students", "List Students"),
  authNote("apikey"),
  bold("Query Parameters:"),
  makeTable(
    ["Param", "Values"],
    [
      ["group", "Sunday, Wednesday"],
      ["lab", "Lab 5, Lab 6, Lab 7"],
      ["status", "sent, pending"],
    ]
  ),
  spacer(),

  methodBadge("POST", "/api/emails/send-all", "Send All Pending Emails"),
  authNote("apikey"),
  para(
    "Optional body: { group, lab } to filter. Returns immediately — emails sent in background."
  ),
  spacer(),

  methodBadge("POST", "/api/emails/send-one", "Send Email to One Student"),
  authNote("apikey"),
  para("Body: { studentId: 'mongodb_id' }"),
  spacer(),

  methodBadge("GET", "/api/emails/status", "Email Dispatch Progress"),
  authNote("apikey"),
  spacer(),

  methodBadge("POST", "/api/emails/retry-failed", "Retry Failed Emails"),
  authNote("apikey"),
  spacer(),

  methodBadge("POST", "/api/emails/reset", "Reset Email Sent Status"),
  authNote("apikey"),
  para("Body options: { email }, { group }, { lab }, or { resetAll: true }"),
  spacer(),

  methodBadge("POST", "/api/emails/test", "Send Test Email"),
  authNote("apikey"),
  para("Body: { email: 'test@sut.edu.eg' }"),
  spacer(),

  methodBadge("GET", "/api/lab-passwords", "Get Lab Passwords"),
  authNote("apikey"),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 11. WEBSOCKET EVENTS
// ═══════════════════════════════════════════════════
sections.push(
  heading("11. WebSocket Events (Socket.io)"),
  para(
    "⚠️ WebSockets work only on local/Railway deployment. On Vercel, use HTTP polling instead."
  ),
  spacer(),
  h3("Connection"),
  ...codeBlock([
    'import { io } from "socket.io-client";',
    "",
    'const socket = io("http://localhost:3000", {',
    "  auth: { token: accessToken },",
    "});",
    "",
    "// Join rooms after connecting:",
    '// Admin: socket.emit("join:admins")',
    "// Student: automatic based on token",
  ]),
  spacer(),

  h3("Events: Server → Admin Dashboard"),
  makeTable(
    ["Event", "Payload", "When"],
    [
      [
        "submission:new",
        "{ submissionId, studentName, lab, problemLetter, language, verdict: 'queued' }",
        "Student submits code",
      ],
      [
        "submission:judged",
        "{ submissionId, studentName, lab, problemLetter, verdict }",
        "Judging complete",
      ],
      [
        "standings:update",
        "Full standings array",
        "An AC submission is judged",
      ],
      [
        "anticheat:alert",
        "{ studentId, studentName, lab, eventType, details, timestamp }",
        "Student triggers anti-cheat",
      ],
      ["contest:started", "{ contestId, startedAt }", "Admin starts contest"],
      ["contest:paused", "{ contestId }", "Admin pauses contest"],
      ["contest:resumed", "{ contestId }", "Admin resumes contest"],
      ["contest:ended", "{ contestId }", "Admin ends contest"],
    ]
  ),
  spacer(),

  h3("Events: Server → Student Screen"),
  makeTable(
    ["Event", "Payload", "When"],
    [
      [
        "submission:verdict",
        "{ submissionId, problemLetter, verdict }",
        "Their submission is judged",
      ],
      ["admin:warning", "{ message }", "Admin sends warning — show modal"],
      [
        "admin:penalty",
        "{ minutes, reason }",
        "Admin adds penalty — show notification",
      ],
      [
        "session:disqualified",
        "{ reason }",
        "Admin disqualifies — force logout",
      ],
      [
        "time:sync",
        "{ bonusSeconds, message }",
        "Admin extends time — update timer",
      ],
      ["contest:paused", "{ contestId }", "Contest paused — freeze screen"],
      ["contest:resumed", "{ contestId }", "Contest resumed — unfreeze"],
      ["contest:ended", "{ contestId }", "Contest ended — redirect to results"],
    ]
  ),
  spacer(),

  h3("Polling Fallback (Vercel)"),
  para("When WebSockets aren't available, poll these endpoints:"),
  makeTable(
    ["Data", "Endpoint", "Interval"],
    [
      ["Standings", "GET /api/standings", "10 seconds"],
      ["My Submissions", "GET /api/submissions/my", "5 seconds"],
      ["Monitor Students", "GET /api/monitor/students", "5 seconds"],
      ["Anti-Cheat Logs", "GET /api/anticheat/logs", "5 seconds"],
      ["Contest Timer", "GET /api/contests/:id/timer", "5 seconds"],
    ]
  ),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 12. ERROR HANDLING
// ═══════════════════════════════════════════════════
sections.push(
  heading("12. Error Handling"),
  para("All errors follow a consistent format:"),
  ...jsonBlock({ success: false, message: "Description of what went wrong" }),
  spacer(),
  makeTable(
    ["Status", "Meaning", "Common Causes"],
    [
      ["400", "Bad Request", "Missing required fields, invalid input"],
      ["401", "Unauthorized", "Missing/invalid token or API key"],
      [
        "403",
        "Forbidden",
        "Insufficient role, disqualified, no active contest, time ended",
      ],
      ["404", "Not Found", "Resource doesn't exist"],
      ["429", "Too Many Requests", "Rate limit (10s between submissions)"],
      ["500", "Server Error", "Database error, judge crash, SMTP failure"],
    ]
  ),
  spacer(),
  h3("Common Error Messages"),
  ...codeBlock([
    '{ success: false, message: "No contest is currently running" }          // 403',
    '{ success: false, message: "You have been disqualified" }               // 403',
    '{ success: false, message: "Your contest time has ended" }              // 403',
    '{ success: false, message: "Wait 10 seconds between submissions" }     // 429',
    '{ success: false, message: "Invalid credentials" }                     // 401',
    '{ success: false, message: "No token provided" }                       // 401',
    '{ success: false, message: "Insufficient permissions" }                // 403',
    '{ success: false, message: "problemId, code, and language are required" } // 400',
  ]),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 13. ENUMS & CONSTANTS
// ═══════════════════════════════════════════════════
sections.push(
  heading("13. Enums & Constants"),
  spacer(),
  h3("Contest Status"),
  makeTable(
    ["Value", "Description"],
    [
      ["not_started", "Created but not yet started"],
      ["running", "Active — students can submit"],
      ["paused", "Temporarily halted — students cannot submit"],
      ["ended", "Contest finished — no more submissions"],
    ]
  ),
  spacer(),
  h3("Contest Type"),
  makeTable(
    ["Value", "Description"],
    [
      ["placement", "Stage 1: Placement Test (60 min, 5 problems)"],
      ["final", "Stage 2: Final Qualification (4-5 hours, 15 problems)"],
    ]
  ),
  spacer(),
  h3("Languages"),
  makeTable(
    ["Value", "Compiler/Runtime"],
    [
      ["cpp", "g++ with C++17 standard"],
      ["python", "Python 3.x"],
      ["java", "OpenJDK 17 (class must be named Main)"],
    ]
  ),
  spacer(),
  h3("Problem Difficulty"),
  makeTable(["Value"], [["easy"], ["medium"], ["hard"]]),
  spacer(),
  h3("Problem Status"),
  makeTable(
    ["Value", "Description"],
    [
      ["draft", "Not visible to students"],
      ["published", "Visible to students during contest"],
    ]
  ),
  spacer(),
  h3("Submission Verdicts"),
  makeTable(
    ["Value"],
    [["queued"], ["judging"], ["AC"], ["WA"], ["TLE"], ["MLE"], ["CE"], ["RE"]]
  ),
  spacer(),
  h3("Anti-Cheat Event Types"),
  makeTable(
    ["Value"],
    [
      ["tab_switch"],
      ["fullscreen_exit"],
      ["paste_attempt"],
      ["copy_attempt"],
      ["idle_timeout"],
      ["warning_sent"],
      ["penalty_added"],
      ["disqualified"],
    ]
  ),
  spacer(),
  h3("User Roles"),
  makeTable(
    ["Value", "Access"],
    [
      ["admin", "Full access to all endpoints"],
      [
        "judge",
        "Problems, submissions, monitoring, standings (cannot create/delete contests)",
      ],
      ["student", "Own submissions, problems, code-save, anti-cheat reporting"],
    ]
  ),
  spacer(),
  h3("Lab Assignments"),
  makeTable(["Value"], [["Lab 5"], ["Lab 6"], ["Lab 7"]]),
  spacer(),
  h3("Test Groups"),
  makeTable(["Value"], [["Sunday"], ["Wednesday"]]),
  pageBreak()
);

// ═══════════════════════════════════════════════════
// 14. FRONTEND FETCH EXAMPLES
// ═══════════════════════════════════════════════════
sections.push(
  heading("14. Frontend Integration Examples"),
  spacer(),

  h3("14.1 Axios Setup"),
  ...codeBlock([
    'import axios from "axios";',
    "",
    "const api = axios.create({",
    '  baseURL: "https://sutech-ecpc-platform.vercel.app/api",',
    '  headers: { "Content-Type": "application/json" },',
    "});",
    "",
    "// Attach token to every request",
    "api.interceptors.request.use((config) => {",
    '  const token = localStorage.getItem("accessToken");',
    "  if (token) config.headers.Authorization = `Bearer ${token}`;",
    "  return config;",
    "});",
    "",
    "// Auto-refresh on 401",
    "api.interceptors.response.use(",
    "  (res) => res,",
    "  async (error) => {",
    "    if (error.response?.status === 401) {",
    '      const refresh = localStorage.getItem("refreshToken");',
    "      if (refresh) {",
    '        const { data } = await axios.post("/api/auth/refresh", { refreshToken: refresh });',
    '        localStorage.setItem("accessToken", data.data.accessToken);',
    '        localStorage.setItem("refreshToken", data.data.refreshToken);',
    "        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;",
    "        return api(error.config);",
    "      }",
    "    }",
    "    return Promise.reject(error);",
    "  }",
    ");",
  ]),
  spacer(),

  h3("14.2 Student Login"),
  ...codeBlock([
    "const login = async (email, universityId) => {",
    '  const { data } = await api.post("/auth/student/login", { email, universityId });',
    '  localStorage.setItem("accessToken", data.data.accessToken);',
    '  localStorage.setItem("refreshToken", data.data.refreshToken);',
    "  return data.data.student;",
    "};",
  ]),
  spacer(),

  h3("14.3 Load Problems"),
  ...codeBlock([
    "const loadProblems = async () => {",
    '  const { data } = await api.get("/problems/contest");',
    "  return data.data; // Array of problems with visible test cases only",
    "};",
  ]),
  spacer(),

  h3("14.4 Run Code (Debug)"),
  ...codeBlock([
    "const runCode = async (problemId, code, language) => {",
    '  const { data } = await api.post("/submissions/run", { problemId, code, language });',
    "  if (data.data.compilationError) {",
    "    showError(data.data.compilationError);",
    "  } else {",
    "    showResults(data.data.results); // [{ input, expected, actual, passed }]",
    "  }",
    "};",
  ]),
  spacer(),

  h3("14.5 Submit Solution"),
  ...codeBlock([
    "const submitSolution = async (problemId, code, language) => {",
    '  const { data } = await api.post("/submissions", { problemId, code, language });',
    "  const submissionId = data.data.submissionId;",
    "",
    "  // Poll for verdict (Vercel fallback)",
    "  const poll = setInterval(async () => {",
    '    const { data: subs } = await api.get("/submissions/my");',
    "    const sub = subs.data.find(s => s._id === submissionId);",
    '    if (sub && sub.verdict !== "queued" && sub.verdict !== "judging") {',
    "      clearInterval(poll);",
    "      showVerdict(sub.verdict);",
    "    }",
    "  }, 3000);",
    "};",
  ]),
  spacer(),

  h3("14.6 Auto-Save Code"),
  ...codeBlock([
    "// Call this with debounce (e.g., 2 seconds after last keystroke)",
    "const autoSave = async (problemId, code, language) => {",
    '  await api.post("/code-save", { problemId, code, language });',
    "};",
    "",
    "// Restore on page load",
    "const restoreCode = async (problemId) => {",
    "  const { data } = await api.get(`/code-save/${problemId}`);",
    "  return data.data?.code || '';",
    "};",
  ]),
  spacer(),

  h3("14.7 Report Anti-Cheat Event"),
  ...codeBlock([
    "// Add these listeners on the contest page",
    'document.addEventListener("visibilitychange", () => {',
    "  if (document.hidden) {",
    '    api.post("/anticheat/event", { eventType: "tab_switch", details: "Tab switched" });',
    "  }",
    "});",
    "",
    'document.addEventListener("fullscreenchange", () => {',
    "  if (!document.fullscreenElement) {",
    '    api.post("/anticheat/event", { eventType: "fullscreen_exit" });',
    "  }",
    "});",
    "",
    "// In code editor — intercept paste",
    "editor.onPaste((e) => {",
    '  const len = e.clipboardData?.getData("text")?.length || 0;',
    "  if (len > 50) {",
    '    api.post("/anticheat/event", {',
    '      eventType: "paste_attempt",',
    "      details: `Attempted to paste ${len} characters`",
    "    });",
    "    e.preventDefault(); // Block the paste",
    "  }",
    "});",
  ]),
  spacer(),

  h3("14.8 Standings Polling"),
  ...codeBlock([
    "// Poll every 10 seconds for live standings",
    "useEffect(() => {",
    "  const interval = setInterval(async () => {",
    '    const { data } = await api.get("/standings", {',
    "      params: { lab: selectedLab, minSolved: minFilter }",
    "    });",
    "    setStandings(data.data);",
    "  }, 10000);",
    "  return () => clearInterval(interval);",
    "}, [selectedLab, minFilter]);",
  ])
);

// ═══════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════
const doc = new Document({
  creator: "IEEE SUTech Backend Team",
  title: "SUTech ECPC Platform — API Documentation",
  description: "Complete API documentation for frontend developers",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
      heading1: {
        run: { font: "Calibri", size: 36, bold: true, color: COLORS.primary },
      },
      heading2: {
        run: { font: "Calibri", size: 28, bold: true, color: COLORS.secondary },
      },
      heading3: {
        run: { font: "Calibri", size: 24, bold: true, color: COLORS.dark },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: sections,
    },
  ],
});

// ── Generate ──
(async () => {
  const buffer = await Packer.toBuffer(doc);
  const filename = "SUTech_ECPC_API_Documentation.docx";
  fs.writeFileSync(filename, buffer);
  console.log(`✅ Generated: ${filename}`);
  console.log(`📄 Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log(`📋 Total sections: 14`);
  console.log(`🔗 Total endpoints documented: 52`);
})();
