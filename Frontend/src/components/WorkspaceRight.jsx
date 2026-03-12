import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import api from '../api';

const PRIMARY = "#006199";
const BOILERPLATE = `#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}`;

const VERDICT_META = {
  AC: { label: 'Accepted', color: '#22c55e' },
  WA: { label: 'Wrong Answer', color: '#f59e0b' },
  TLE: { label: 'Time Limit Exceeded', color: '#f97316' },
  MLE: { label: 'Memory/Output Limit Exceeded', color: '#fb7185' },
  RE: { label: 'Runtime Error', color: '#ef4444' },
  CE: { label: 'Compilation Error', color: '#ef4444' },
};

function summarizeResults(results = []) {
  const verdictBreakdown = { AC: 0, WA: 0, TLE: 0, MLE: 0, RE: 0, CE: 0 };
  for (const r of results) {
    if (r.verdict && Object.prototype.hasOwnProperty.call(verdictBreakdown, r.verdict)) {
      verdictBreakdown[r.verdict] += 1;
    }
  }
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const firstFailure = results.find((r) => !r.passed) || null;

  return {
    total: results.length,
    passed,
    failed,
    verdictBreakdown,
    firstFailure,
  };
}

export default function WorkspaceRight({ activeTab, onFinalSubmit }) {
  const [code, setCode]                 = useState(BOILERPLATE);
  const [language, setLanguage]         = useState('cpp');
  const [isExpanded, setIsExpanded]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outputStatus, setOutputStatus] = useState('idle');
  const [outputResult, setOutputResult] = useState(null);
  const [sampleResults, setSampleResults] = useState([]);
  const [problemId, setProblemId]       = useState(null);

  const editorRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: probs } = await api.get('/problems/contest');
        const current = probs.data.find(p => p.letter === activeTab);
        if (current) {
          setProblemId(current._id);
          const saved = await api.get(`/code-save/${current._id}`);
          if (saved.data.data) {
            setCode(saved.data.data.code);
            setLanguage(saved.data.data.language || 'cpp');
          } else {
            setCode(BOILERPLATE);
          }
        }
      } catch (err) { console.error(err); }
    };
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (!problemId || !code || code === BOILERPLATE) return;
    const timeoutId = setTimeout(() => {
      api.post('/code-save', { problemId, code, language });
    }, 10000);
    return () => clearTimeout(timeoutId);
  }, [code, problemId, language]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    editor.onDidPaste(async (e) => {
      const pastedText = editor.getModel().getValueInRange(e.range);
      if (pastedText.length > 50) {
        api.post("/anticheat/event", {
          eventType: "paste_attempt",
          details: `Attempted to paste ${pastedText.length} characters`,
        });
        alert("Warning: Pasting large blocks of code is prohibited. This incident has been logged.");
      }
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default boilerplate?")) {
      setCode(BOILERPLATE);
    }
  };

  const handleRunCode = async () => {
    if (!problemId) return;
    setIsExpanded(true);
    setOutputStatus('loading');
    setSampleResults([]);
    try {
      const { data } = await api.post("/submissions/run", { problemId, code, language });
      const results = data.data;
      setSampleResults(results.results || []);

      if (results.compilationError) {
        setOutputResult({
          title: "Compilation Error",
          details: "Compilation failed. Check your syntax and language rules.",
          backend: results.judgeBackend || results.results?.find((r) => r.backend)?.backend || null,
          icon: "error",
          color: "#ef4444",
          bg: "rgba(239,68,68,0.1)",
        });
        setOutputStatus('complete');
        return;
      }

      const summary = results.summary || summarizeResults(results.results || []);
      const allPassed = summary.total > 0 && summary.failed === 0;
      const firstFailure = summary.firstFailure;
      const failureVerdict = firstFailure?.verdict || 'WA';
      const failureLabel = VERDICT_META[failureVerdict]?.label || failureVerdict;

      setOutputResult({
        title: allPassed ? "Sample Tests Passed" : failureLabel,
        details: allPassed
          ? `All sample tests passed (${summary.passed}/${summary.total}).`
          : `Passed ${summary.passed}/${summary.total}. Verdict: ${failureVerdict}.`,
        backend: results.judgeBackend || results.results?.find((r) => r.backend)?.backend || null,
        icon: allPassed ? "check_circle" : "warning",
        color: allPassed ? "#22c55e" : (VERDICT_META[failureVerdict]?.color || "#f59e0b"),
        bg: allPassed ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
        summary,
      });
      setOutputStatus('complete');
    } catch (err) {
      setOutputStatus('complete');
      setOutputResult({
        title: 'Run Failed',
        details: err.response?.data?.message || err.message || 'Unexpected judge error',
        backend: null,
        icon: 'error',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
      });
    }
  };

  const handleSubmit = async () => {
    if (!problemId) return;
    if (activeTab === 'E') {
      if (!window.confirm("Are you sure you want to make the final submission? This will end the contest.")) return;
    }
    setIsSubmitting(true);
    setIsExpanded(true);
    setOutputStatus('loading');
    setSampleResults([]);
    try {
      await api.post("/submissions", { problemId, code, language });
      const poll = setInterval(async () => {
        const { data: res } = await api.get(`/submissions/my/${activeTab}`);
        const latest = res.data[0];
        if (latest && latest.verdict !== 'queued' && latest.verdict !== 'judging') {
          clearInterval(poll);
          const isAC = latest.verdict === 'AC';
          setOutputResult({
            title:   isAC ? "Accepted (AC)" : latest.verdict,
            details: isAC
              ? "All test cases passed!"
              : "Submission judged. Review your approach and try again.",
            backend: latest.judgeBackend || null,
            icon:    isAC ? "check_circle" : "cancel",
            color:   isAC ? "#22c55e" : "#ef4444",
            bg:      isAC ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          });
          setOutputStatus('complete');
          setIsSubmitting(false);
          if (activeTab === 'E' && isAC && onFinalSubmit) onFinalSubmit();
        }
      }, 3000);
    } catch (err) {
      setIsSubmitting(false);
      setOutputStatus('complete');
      setOutputResult({
        title: 'Submit Failed',
        details: err.response?.data?.message || err.message || 'Unexpected submit error',
        backend: null,
        icon: 'error',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
      });
    }
  };

  const editorLanguage = language === 'python' ? 'python' : language === 'java' ? 'java' : 'cpp';

  const LANG_OPTIONS = [
    { value: 'cpp',    label: 'C++ (G++ 20)'  },
    { value: 'python', label: 'Python 3.10'    },
    { value: 'java',   label: 'Java 17'        },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#1e1e1e",
        overflow: "hidden",
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          borderBottom: "1px solid #2d2d2d",
          background: "#1e1e1e",
          flexShrink: 0,
        }}
      >
        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            background: "#2d2d2d",
            border: "1px solid #3d3d3d",
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "13px",
            fontWeight: "600",
            color: "#d4d4d4",
            outline: "none",
            cursor: "pointer",
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          {LANG_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Settings + Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleReset}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "5px 10px", borderRadius: "6px",
              border: "1px solid #3d3d3d", background: "transparent",
              color: "#94a3b8", cursor: "pointer", fontSize: "12px",
              fontFamily: "Space Grotesk, sans-serif",
            }}
            title="Reset to boilerplate"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>restart_alt</span>
            Reset
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <Editor
          height="100%"
          language={editorLanguage}
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val)}
          onMount={handleEditorDidMount}
          loading={
            <div style={{ color: "#6b7280", padding: "16px", fontSize: "13px" }}>
              Loading Editor...
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', Consolas, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "off",
          }}
        />
      </div>

      {/* Console Panel */}
      <div
        style={{
          borderTop: "1px solid #2d2d2d",
          background: "#1e1e1e",
          flexShrink: 0,
          transition: "all 0.3s",
        }}
      >
        {/* Console Toggle Bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 14px",
            cursor: "pointer",
            background: "#2d2d2d",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", letterSpacing: "0.1em" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>terminal</span>
            CONSOLE
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#6b7280" }}>
            {isExpanded ? "keyboard_arrow_down" : "keyboard_arrow_up"}
          </span>
        </div>

        {/* Console Content */}
        {isExpanded && (
          <div
            style={{
              padding: "14px",
              maxHeight: "300px",
              overflowY: "auto",
              background: outputStatus === 'complete' && outputResult?.bg ? outputResult.bg : "#1e1e1e",
            }}
          >
            {outputStatus === 'idle' && (
              <div style={{ color: "#6b7280", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                Run or Submit your code to see results here.
              </div>
            )}
            {outputStatus === 'loading' && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "100%", paddingLeft: "8px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#3b82f6", animation: "spin 1s linear infinite" }}>
                  progress_activity
                </span>
                <span style={{ fontSize: "13px", color: "#9ca3af" }}>Executing on judge servers...</span>
              </div>
            )}
            {outputStatus === 'complete' && outputResult && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "22px", color: outputResult.color, flexShrink: 0 }}>
                    {outputResult.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: outputResult.color }}>{outputResult.title}</div>
                    {outputResult.backend && (
                      <div style={{ fontSize: "11px", color: "#93c5fd", marginTop: "2px" }}>
                        Judge Backend: {outputResult.backend}
                      </div>
                    )}
                    <div style={{ fontSize: "13px", color: "#d1d5db", marginTop: "4px", whiteSpace: "pre-wrap" }}>{outputResult.details}</div>
                    {outputResult.summary && (
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                        Summary: total {outputResult.summary.total}, pass {outputResult.summary.passed}, fail {outputResult.summary.failed}
                      </div>
                    )}
                  </div>
                </div>
                {sampleResults.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {sampleResults.map((r, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: "12px",
                          color: r.passed ? "#22c55e" : "#fca5a5",
                          background: "rgba(15,23,42,0.35)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                        }}
                      >
                        <div>
                          #{r.testCaseIndex || idx + 1} {r.verdict || (r.passed ? 'AC' : 'WA')} {r.executionTimeMs != null ? `- ${r.executionTimeMs}ms` : ''}
                          {r.backend ? ` - ${r.backend}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "10px 16px",
          borderTop: "1px solid #2d2d2d",
          background: "#1e1e1e",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        {/* Run Tests (outlined) */}
        <button
          onClick={handleRunCode}
          disabled={isSubmitting || outputStatus === 'loading'}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 18px",
            border: `1.5px solid ${PRIMARY}`,
            borderRadius: "8px",
            background: "transparent",
            color: PRIMARY,
            fontSize: "13px",
            fontWeight: "700",
            cursor: (isSubmitting || outputStatus === 'loading') ? "not-allowed" : "pointer",
            fontFamily: "Space Grotesk, sans-serif",
            opacity: (isSubmitting || outputStatus === 'loading') ? 0.5 : 1,
            transition: "all 0.15s",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>play_arrow</span>
          Run Tests
        </button>

        {/* Submit Solution (solid) */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || outputStatus === 'loading'}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 18px",
            border: "none",
            borderRadius: "8px",
            background: PRIMARY,
            color: "#fff",
            fontSize: "13px",
            fontWeight: "700",
            cursor: (isSubmitting || outputStatus === 'loading') ? "not-allowed" : "pointer",
            fontFamily: "Space Grotesk, sans-serif",
            opacity: (isSubmitting || outputStatus === 'loading') ? 0.7 : 1,
            transition: "all 0.15s",
          }}
        >
          {isSubmitting ? (
            <span className="material-symbols-outlined" style={{ fontSize: "16px", animation: "spin 1s linear infinite" }}>
              progress_activity
            </span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>send</span>
          )}
          {isSubmitting ? 'Submitting...' : 'Submit Solution'}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
