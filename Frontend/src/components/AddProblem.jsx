import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import api from "../api";

const PRIMARY = "#006199";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// ── Common input style ────────────────────────────────────────────────────────
const inp = {
  border: "1.5px solid #e2e8f0",
  borderRadius: "8px",
  padding: "9px 12px",
  fontSize: "13px",
  outline: "none",
  fontFamily: "Space Grotesk, sans-serif",
  color: "#1e293b",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};
const lbl = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#64748b",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "5px",
};

// ── Sample test pair ──────────────────────────────────────────────────────────
function TestPair({ index, item, onChange, onRemove, label }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "14px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#475569",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              background: PRIMARY,
              color: "#fff",
              borderRadius: "5px",
              padding: "2px 7px",
              fontSize: "10px",
            }}
          >
            #{index + 1}
          </span>
          {label}
        </span>
        <button
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            padding: "2px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            delete
          </span>
        </button>
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Input</label>
          <textarea
            value={item.input}
            onChange={(e) => onChange(index, "input", e.target.value)}
            placeholder="Sample input..."
            style={{
              ...inp,
              height: "100px",
              resize: "vertical",
              fontFamily: "'Courier New', monospace",
              fontSize: "12px",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Expected Output</label>
          <textarea
            value={item.expectedOutput}
            onChange={(e) => onChange(index, "expectedOutput", e.target.value)}
            placeholder="Expected output..."
            style={{
              ...inp,
              height: "100px",
              resize: "vertical",
              fontFamily: "'Courier New', monospace",
              fontSize: "12px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AddProblem() {
  const navigate = useNavigate();

  // Contest
  const [contestId, setContestId]       = useState(null);
  const [contestTitle, setContestTitle] = useState(null);
  const [contestError, setContestError] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState("statement");

  // Form state
  const [form, setForm] = useState({
    letter:            "A",
    title:             "",
    description:       "",
    inputDescription:  "",
    outputDescription: "",
    notes:             "",
    timeLimitSeconds:  2,
    memoryLimitMB:     256,
    checkerMode:       "token",
    difficulty:        "easy",
    order:             0,
  });

  // Test cases
  const [samples, setSamples]           = useState([{ input: "", expectedOutput: "" }]);
  const [hiddenTests, setHiddenTests]   = useState([]);

  // Polygon integration
  const [polyKey, setPolyKey]           = useState("");
  const [polySecret, setPolySecret]     = useState("");
  const [polyProblems, setPolyProblems] = useState([]);
  const [polyLoading, setPolyLoading]       = useState(false);
  const [polyError, setPolyError]           = useState(null);
  const [polyImporting, setPolyImporting]   = useState(null);
  const [polySuccess, setPolySuccess]       = useState(null); // imported problem name

  // Submit state
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(false);

  // Fetch active contest
  useEffect(() => {
    api.get("/contests/active")
      .then((res) => {
        if (!res.data.success || !res.data.data) throw new Error("No active contest.");
        setContestId(res.data.data._id);
        setContestTitle(res.data.data.title);
      })
      .catch((err) => setContestError(err.response?.data?.message || err.message));
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Test case helpers ──────────────────────────────────────────────────────
  const updateSample = (i, k, v) =>
    setSamples((prev) => prev.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  const addSample    = () => setSamples((p) => [...p, { input: "", expectedOutput: "" }]);
  const removeSample = (i) => setSamples((p) => p.filter((_, idx) => idx !== i));

  const updateHidden = (i, k, v) =>
    setHiddenTests((prev) => prev.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  const addHidden    = () => setHiddenTests((p) => [...p, { input: "", expectedOutput: "" }]);
  const removeHidden = (i) => setHiddenTests((p) => p.filter((_, idx) => idx !== i));

  // ── Polygon ────────────────────────────────────────────────────────────────
  const fetchPolygonProblems = async () => {
    if (!polyKey || !polySecret) {
      setPolyError("Enter your Polygon API Key and Secret first.");
      return;
    }
    setPolyLoading(true);
    setPolyError(null);
    try {
      const res = await api.post("/polygon/problems", { apiKey: polyKey, apiSecret: polySecret });
      setPolyProblems(res.data.data || []);
    } catch (err) {
      setPolyError(err.response?.data?.message || err.message);
    } finally {
      setPolyLoading(false);
    }
  };

  const importPolygonProblem = async (problemId, problemName) => {
    setPolyImporting(problemId);
    setPolyError(null);
    setPolySuccess(null);
    try {
      const res = await api.post("/polygon/import", {
        apiKey: polyKey,
        apiSecret: polySecret,
        problemId: String(problemId),
      });
      const d = res.data.data;

      // Always apply returned values (title/limits always come from Polygon)
      setForm((f) => ({
        ...f,
        title:             d.title             || f.title,
        description:       d.description       || f.description,
        inputDescription:  d.inputDescription  || f.inputDescription,
        outputDescription: d.outputDescription || f.outputDescription,
        notes:             d.notes             || f.notes,
        timeLimitSeconds:  d.timeLimitSeconds  || f.timeLimitSeconds,
        memoryLimitMB:     d.memoryLimitMB     || f.memoryLimitMB,
      }));

      if (d.testCases?.length) {
        setSamples(d.testCases.filter((t) => t.isVisible).map((t) => ({ input: t.input, expectedOutput: t.expectedOutput })));
        setHiddenTests(d.testCases.filter((t) => !t.isVisible).map((t) => ({ input: t.input, expectedOutput: t.expectedOutput })));
      }

      if (d.stmtWarning || d.testImportWarning) {
        setPolyError([d.stmtWarning, d.testImportWarning].filter(Boolean).join(" | "));
      }

      setPolySuccess(d.title || problemName || "Problem");
      // Switch to Statement tab after short delay so user sees success
      setTimeout(() => setActiveTab("statement"), 1500);
    } catch (err) {
      setPolyError(err.response?.data?.message || err.message);
    } finally {
      setPolyImporting(null);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (publish = false) => {
    if (!contestId) { setError("No active contest found."); return; }
    if (!form.letter || !form.title.trim()) { setError("Letter and Title are required."); return; }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const allTestCases = [
        ...samples.map((t) => ({ ...t, isVisible: true  })),
        ...hiddenTests.map((t) => ({ ...t, isVisible: false })),
      ];

      const res = await api.post("/problems", {
        contestId,
        letter:            form.letter.toUpperCase(),
        title:             form.title,
        description:       form.description,
        inputDescription:  form.inputDescription,
        outputDescription: form.outputDescription,
        notes:             form.notes,
        timeLimitSeconds:  Number(form.timeLimitSeconds) || 1,
        memoryLimitMB:     Number(form.memoryLimitMB)    || 256,
        checkerMode:       form.checkerMode,
        difficulty:        form.difficulty,
        order:             Number(form.order) || 0,
        testCases:         allTestCases,
      });

      if (!res.data.success) throw new Error(res.data.message);

      if (publish) await api.patch(`/problems/${res.data.data._id}/publish`);

      setSuccess(true);
      setTimeout(() => navigate("/admin/problems"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "statement", label: "Statement",      icon: "article"          },
    { id: "tests",     label: "Test Cases",     icon: "code"             },
    { id: "polygon",   label: "Polygon Import", icon: "cloud_download"   },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7f8",
        fontFamily: "Space Grotesk, sans-serif",
        color: "#1e293b",
      }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          to="/admin/problems"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            color: "#64748b",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            arrow_back
          </span>
          Problems
        </Link>

        <span style={{ color: "#e2e8f0" }}>|</span>

        <div style={{ flex: 1 }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b" }}>
            New Problem
          </span>
          {contestTitle && (
            <span
              style={{
                marginLeft: "10px",
                fontSize: "11px",
                color: PRIMARY,
                background: `rgba(0,97,153,0.08)`,
                padding: "2px 10px",
                borderRadius: "20px",
                fontWeight: "700",
              }}
            >
              {contestTitle}
            </span>
          )}
          {contestError && (
            <span
              style={{
                marginLeft: "10px",
                fontSize: "11px",
                color: "#ef4444",
                background: "#fef2f2",
                padding: "2px 10px",
                borderRadius: "20px",
                fontWeight: "700",
              }}
            >
              ⚠ {contestError}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          style={{
            padding: "8px 18px",
            border: `1.5px solid ${PRIMARY}`,
            borderRadius: "8px",
            background: "#fff",
            color: PRIMARY,
            fontSize: "13px",
            fontWeight: "700",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "Space Grotesk, sans-serif",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Draft"}
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          style={{
            padding: "8px 18px",
            border: "none",
            borderRadius: "8px",
            background: PRIMARY,
            color: "#fff",
            fontSize: "13px",
            fontWeight: "700",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "Space Grotesk, sans-serif",
            opacity: saving ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
            publish
          </span>
          Publish
        </button>
      </div>

      {/* Feedback */}
      {(error || success) && (
        <div
          style={{
            margin: "12px 24px 0",
            padding: "10px 16px",
            borderRadius: "9px",
            background: success ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${success ? "#bbf7d0" : "#fecaca"}`,
            color: success ? "#16a34a" : "#dc2626",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {success ? "✓ Problem created successfully! Redirecting…" : error}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>

        {/* ── Left: Tabs + Content ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Tab Bar */}
          <div
            style={{
              background: "#fff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              padding: "0 24px",
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "12px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  fontFamily: "Space Grotesk, sans-serif",
                  color: activeTab === t.id ? PRIMARY : "#64748b",
                  borderBottom: activeTab === t.id ? `2px solid ${PRIMARY}` : "2px solid transparent",
                  marginBottom: "-1px",
                  transition: "all 0.15s",
                  ...(t.id === "polygon"
                    ? { color: activeTab === t.id ? "#7c3aed" : "#94a3b8", borderColor: activeTab === t.id ? "#7c3aed" : "transparent" }
                    : {}),
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  {t.icon}
                </span>
                {t.label}
                {t.id === "polygon" && (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "700",
                      background: "#7c3aed",
                      color: "#fff",
                      padding: "1px 5px",
                      borderRadius: "8px",
                    }}
                  >
                    NEW
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

            {/* ── STATEMENT TAB ── */}
            {activeTab === "statement" && (
              <div style={{ maxWidth: "860px", display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* Title */}
                <div>
                  <label style={lbl}>Problem Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="e.g. Two Sum, Maximum Subarray, Dijkstra's Shortest Path"
                    style={{ ...inp, fontSize: "16px", fontWeight: "700", padding: "12px 14px" }}
                  />
                </div>

                {/* Legend */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={lbl}>Legend (Problem Statement)</label>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>{"Supports LaTeX: $x^2$, \\sum, \\frac{a}{b}"}</span>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder={"Write the full problem statement here...\n\nYou are given an array of $n$ integers. Find the maximum sum subarray.\n\nSupports LaTeX notation for mathematical formulas."}
                    style={{
                      ...inp,
                      height: "200px",
                      resize: "vertical",
                      lineHeight: "1.7",
                      fontSize: "13px",
                    }}
                  />
                </div>

                {/* Input Spec */}
                <div>
                  <label style={lbl}>Input Specification</label>
                  <textarea
                    value={form.inputDescription}
                    onChange={(e) => setField("inputDescription", e.target.value)}
                    placeholder={"The first line contains an integer $n$ ($1 \\le n \\le 10^5$).\nThe second line contains $n$ integers $a_1, a_2, \\ldots, a_n$."}
                    style={{ ...inp, height: "100px", resize: "vertical", lineHeight: "1.7" }}
                  />
                </div>

                {/* Output Spec */}
                <div>
                  <label style={lbl}>Output Specification</label>
                  <textarea
                    value={form.outputDescription}
                    onChange={(e) => setField("outputDescription", e.target.value)}
                    placeholder={"Print a single integer — the maximum subarray sum."}
                    style={{ ...inp, height: "80px", resize: "vertical", lineHeight: "1.7" }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={lbl}>Notes (Optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Hints, explanations for the sample test cases, or additional constraints..."
                    style={{ ...inp, height: "80px", resize: "vertical", lineHeight: "1.7" }}
                  />
                </div>
              </div>
            )}

            {/* ── TEST CASES TAB ── */}
            {activeTab === "tests" && (
              <div style={{ maxWidth: "860px" }}>

                {/* Samples */}
                <div style={{ marginBottom: "32px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 2px" }}>
                        Sample Test Cases
                      </h3>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>
                        Visible to contestants in the problem statement
                      </p>
                    </div>
                    <button
                      onClick={addSample}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "7px 14px",
                        border: `1.5px solid ${PRIMARY}`,
                        borderRadius: "8px",
                        background: "#fff",
                        color: PRIMARY,
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontFamily: "Space Grotesk, sans-serif",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>add</span>
                      Add Sample
                    </button>
                  </div>
                  {samples.map((s, i) => (
                    <TestPair
                      key={i}
                      index={i}
                      item={s}
                      label="Sample Test Case"
                      onChange={updateSample}
                      onRemove={() => removeSample(i)}
                    />
                  ))}
                  {samples.length === 0 && (
                    <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "20px" }}>
                      No sample tests yet.
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px dashed #e2e8f0", margin: "24px 0" }} />

                {/* Hidden Tests */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 2px" }}>
                        Hidden Test Cases
                      </h3>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>
                        Used for judging only — not visible to contestants
                      </p>
                    </div>
                    <button
                      onClick={addHidden}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "7px 14px",
                        border: "1.5px solid #94a3b8",
                        borderRadius: "8px",
                        background: "#fff",
                        color: "#475569",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontFamily: "Space Grotesk, sans-serif",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>add</span>
                      Add Hidden Test
                    </button>
                  </div>
                  {hiddenTests.map((h, i) => (
                    <TestPair
                      key={i}
                      index={i}
                      item={h}
                      label="Hidden Test Case"
                      onChange={updateHidden}
                      onRemove={() => removeHidden(i)}
                    />
                  ))}
                  {hiddenTests.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px",
                        border: "2px dashed #e2e8f0",
                        borderRadius: "12px",
                        color: "#94a3b8",
                        fontSize: "13px",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "32px", display: "block", marginBottom: "6px" }}>
                        lock
                      </span>
                      No hidden test cases yet. Add some to strengthen the judge.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── POLYGON IMPORT TAB ── */}
            {activeTab === "polygon" && (
              <div style={{ maxWidth: "860px" }}>

                {/* Header */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                    borderRadius: "14px",
                    padding: "20px 24px",
                    marginBottom: "24px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "36px" }}>
                    cloud_download
                  </span>
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: "800" }}>Polygon by Codeforces</div>
                    <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>
                      Import problems directly from your Polygon account. Get your API keys at polygon.codeforces.com → Settings → API.
                    </div>
                  </div>
                </div>

                {/* API Credentials */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <p style={{ fontSize: "13px", fontWeight: "700", margin: "0 0 14px", color: "#1e293b" }}>
                    API Credentials
                  </p>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>API Key</label>
                      <input
                        type="text"
                        value={polyKey}
                        onChange={(e) => setPolyKey(e.target.value)}
                        placeholder="Your Polygon API Key"
                        style={inp}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>API Secret</label>
                      <input
                        type="password"
                        value={polySecret}
                        onChange={(e) => setPolySecret(e.target.value)}
                        placeholder="Your Polygon API Secret"
                        style={inp}
                      />
                    </div>
                  </div>
                  <button
                    onClick={fetchPolygonProblems}
                    disabled={polyLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 20px",
                      background: "#7c3aed",
                      border: "none",
                      borderRadius: "9px",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: polyLoading ? "not-allowed" : "pointer",
                      fontFamily: "Space Grotesk, sans-serif",
                      opacity: polyLoading ? 0.7 : 1,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      {polyLoading ? "hourglass_empty" : "search"}
                    </span>
                    {polyLoading ? "Fetching…" : "Fetch My Problems"}
                  </button>
                </div>

                {/* Success */}
                {polySuccess && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: "#16a34a",
                      borderRadius: "9px",
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                    <span>
                      <strong>"{polySuccess}"</strong> imported successfully! Switching to Statement tab…
                    </span>
                  </div>
                )}

                {/* Error */}
                {polyError && (
                  <div
                    style={{
                      padding: "10px 16px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      borderRadius: "9px",
                      fontSize: "13px",
                      marginBottom: "16px",
                    }}
                  >
                    {polyError}
                  </div>
                )}

                {/* Problem List */}
                {polyProblems.length > 0 && (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "#f8fafc",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#475569",
                      }}
                    >
                      {polyProblems.length} problems found — select one to import
                    </div>
                    {polyProblems.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderBottom: "1px solid #f8fafc",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                            ID: {p.id}
                            {p.owner && ` · Owner: ${p.owner}`}
                          </div>
                        </div>
                        <button
                          onClick={() => importPolygonProblem(p.id, p.name)}
                          disabled={polyImporting === p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 14px",
                            border: "none",
                            borderRadius: "8px",
                            background: polyImporting === p.id ? "#f1f5f9" : "#7c3aed",
                            color: polyImporting === p.id ? "#94a3b8" : "#fff",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: polyImporting === p.id ? "not-allowed" : "pointer",
                            fontFamily: "Space Grotesk, sans-serif",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                            {polyImporting === p.id ? "hourglass_empty" : "download"}
                          </span>
                          {polyImporting === p.id ? "Importing…" : "Import"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {polyProblems.length === 0 && !polyLoading && !polyError && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      border: "2px dashed #e2e8f0",
                      borderRadius: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "40px", display: "block", marginBottom: "8px", color: "#c4b5fd" }}>
                      cloud_download
                    </span>
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>Enter your API credentials above</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      and click <strong>Fetch My Problems</strong> to browse your Polygon library
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div
          style={{
            width: "260px",
            minWidth: "260px",
            background: "#fff",
            borderLeft: "1px solid #e2e8f0",
            overflowY: "auto",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
            Problem Config
          </p>

          {/* Letter */}
          <div>
            <label style={lbl}>Problem Letter *</label>
            <select
              value={form.letter}
              onChange={(e) => setField("letter", e.target.value)}
              style={{ ...inp, cursor: "pointer" }}
            >
              {LETTERS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label style={lbl}>Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setField("difficulty", e.target.value)}
              style={{ ...inp, cursor: "pointer" }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Time Limit */}
          <div>
            <label style={lbl}>Time Limit (seconds)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={form.timeLimitSeconds}
              onChange={(e) => setField("timeLimitSeconds", e.target.value)}
              style={inp}
            />
          </div>

          {/* Checker */}
          <div>
            <label style={lbl}>Checker Mode</label>
            <select
              value={form.checkerMode}
              onChange={(e) => setField("checkerMode", e.target.value)}
              style={{ ...inp, cursor: "pointer" }}
            >
              <option value="token">Token (ignore extra spaces)</option>
              <option value="line">Line by line</option>
              <option value="exact">Exact match</option>
            </select>
          </div>

          {/* Memory Limit */}
          <div>
            <label style={lbl}>Memory Limit (MB)</label>
            <input
              type="number"
              min="16"
              max="1024"
              value={form.memoryLimitMB}
              onChange={(e) => setField("memoryLimitMB", e.target.value)}
              style={inp}
            />
          </div>

          {/* Order */}
          <div>
            <label style={lbl}>Sort Order</label>
            <input
              type="number"
              min="0"
              value={form.order}
              onChange={(e) => setField("order", e.target.value)}
              style={inp}
              placeholder="0"
            />
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>
              Summary
            </p>

            {[
              { label: "Samples",      value: samples.length },
              { label: "Hidden Tests", value: hiddenTests.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginBottom: "6px",
                  color: "#64748b",
                }}
              >
                <span>{label}</span>
                <strong style={{ color: "#1e293b" }}>{value}</strong>
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              style={{
                padding: "10px",
                border: `1.5px solid ${PRIMARY}`,
                borderRadius: "8px",
                background: "#fff",
                color: PRIMARY,
                fontSize: "13px",
                fontWeight: "700",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "Space Grotesk, sans-serif",
                opacity: saving ? 0.6 : 1,
              }}
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              style={{
                padding: "10px",
                border: "none",
                borderRadius: "8px",
                background: PRIMARY,
                color: "#fff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "Space Grotesk, sans-serif",
                opacity: saving ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>publish</span>
              {saving ? "Saving…" : "Publish Problem"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
