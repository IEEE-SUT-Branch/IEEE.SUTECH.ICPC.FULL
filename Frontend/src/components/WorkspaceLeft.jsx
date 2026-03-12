import React, { useState, useEffect } from 'react';
import api from '../api';
import ProblemText from './ProblemText';

const PRIMARY = "#006199";

const DIFFICULTY_CONFIG = {
  easy:   { dot: '#22c55e', text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  medium: { dot: '#f59e0b', text: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  hard:   { dot: '#ef4444', text: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};

const SkeletonLoader = () => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
    <div style={{ display: "flex", padding: "10px", gap: "8px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
      {[1, 2, 3].map(i => <div key={i} style={{ height: "36px", width: "96px", background: "#e2e8f0", borderRadius: "8px" }} />)}
    </div>
    <div style={{ flex: 1, padding: "32px", maxWidth: "720px", margin: "0 auto", width: "100%" }}>
      <div style={{ height: "36px", width: "60%", background: "#e2e8f0", borderRadius: "8px", marginBottom: "24px" }} />
      <div style={{ display: "flex", gap: "24px", marginBottom: "32px" }}>
        {[1, 2].map(i => <div key={i} style={{ height: "16px", width: "128px", background: "#f1f5f9", borderRadius: "6px" }} />)}
      </div>
      {[1, 2, 3].map(i => <div key={i} style={{ height: "14px", width: "100%", background: "#f8fafc", borderRadius: "6px", marginBottom: "12px" }} />)}
    </div>
  </div>
);

function SampleBox({ title, content }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ flex: 1, minWidth: "200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "0 2px" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {title}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            fontSize: "11px", fontWeight: "700",
            color: copied ? "#16a34a" : PRIMARY,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "Space Grotesk, sans-serif", padding: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
            {copied ? "check_circle" : "content_copy"}
          </span>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div
        style={{
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "14px 16px",
          fontFamily: "'Fira Code', 'Cascadia Code', monospace",
          fontSize: "13px",
          whiteSpace: "pre-wrap",
          color: "#1e293b",
          wordBreak: "break-all",
        }}
      >
        {content}
      </div>
    </div>
  );
}

export default function WorkspaceLeft({ activeTab, setActiveTab }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const { data } = await api.get("/problems/contest");
        setProblems(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, []);

  if (loading) return <SkeletonLoader />;

  if (problems.length === 0) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100%", background: "#fff",
          textAlign: "center", padding: "32px",
          fontFamily: "Space Grotesk, sans-serif",
        }}
      >
        <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "50%", marginBottom: "16px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#e2e8f0" }}>help</span>
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px" }}>No Problems Yet</h2>
        <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "280px", lineHeight: "1.5" }}>
          The contest organizer hasn&apos;t published any problems for this session yet.
        </p>
      </div>
    );
  }

  const activeProblem = problems.find(p => p.letter === activeTab) || problems[0];
  const diffStyle = DIFFICULTY_CONFIG[activeProblem.difficulty] || DIFFICULTY_CONFIG.easy;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#fff",
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      {/* Problem Tabs */}
      <div
        style={{
          display: "flex",
          padding: "8px 10px",
          gap: "6px",
          borderBottom: "2px solid #f1f5f9",
          background: "#f8fafc",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {problems.map((prob) => {
          const isActive = activeTab === prob.letter;
          return (
            <button
              key={prob.letter}
              onClick={() => setActiveTab(prob.letter)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "13px",
                fontWeight: isActive ? "700" : "600",
                background: isActive ? `rgba(0,97,153,0.09)` : "transparent",
                color: isActive ? PRIMARY : "#64748b",
                borderBottom: isActive ? `2px solid ${PRIMARY}` : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {/* Status Icon */}
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "16px",
                  color: prob.status === 'solved' ? "#22c55e"
                       : prob.status === 'wrong'  ? "#ef4444"
                       : "#94a3b8",
                }}
              >
                {prob.status === 'solved' ? "check_circle"
               : prob.status === 'wrong'  ? "warning"
               : "circle"}
              </span>
              Problem {prob.letter}
            </button>
          );
        })}
      </div>

      {/* Problem Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          {/* Title Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "12px" }}>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: "800",
                color: "#1e293b",
                margin: 0,
                letterSpacing: "-0.01em",
                lineHeight: "1.2",
              }}
            >
              {activeProblem.letter}. {activeProblem.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              {/* Difficulty Badge */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "20px",
                  background: diffStyle.bg, border: `1px solid ${diffStyle.border}`,
                  fontSize: "10px", fontWeight: "700", textTransform: "uppercase",
                  letterSpacing: "0.1em", color: diffStyle.text,
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: diffStyle.dot, display: "inline-block" }} />
                {activeProblem.difficulty}
              </div>
              {/* PDF Button */}
              {activeProblem.pdfUrl && (
                <a
                  href={activeProblem.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "5px 10px", borderRadius: "8px",
                    border: "1px solid #e2e8f0", background: "#fff",
                    fontSize: "11px", fontWeight: "700", color: "#64748b",
                    textDecoration: "none",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>picture_as_pdf</span>
                  PDF
                </a>
              )}
            </div>
          </div>

          {/* Limits */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>timer</span>
              Time limit: <strong style={{ color: "#1e293b" }}>{activeProblem.timeLimitSeconds}.0s</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>memory</span>
              Memory limit: <strong style={{ color: "#1e293b" }}>{activeProblem.memoryLimitMB}MB</strong>
            </div>
          </div>

          {/* Description */}
          <div style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7", marginBottom: "24px" }}>
            <ProblemText text={activeProblem.description} />
          </div>

          {/* Input */}
          {activeProblem.inputDescription && (
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                Input
              </h2>
              <div
                style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7" }}
              >
                <ProblemText text={activeProblem.inputDescription} />
              </div>
            </div>
          )}

          {/* Output */}
          {activeProblem.outputDescription && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                Output
              </h2>
              <div
                style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7" }}
              >
                <ProblemText text={activeProblem.outputDescription} />
              </div>
            </div>
          )}

          {/* Notes */}
          {activeProblem.notes && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                Notes
              </h2>
              <div style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7" }}>
                <ProblemText text={activeProblem.notes} />
              </div>
            </div>
          )}

          {/* Sample I/O */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {activeProblem.testCases?.filter(tc => tc.isVisible).map((tc, index) => (
              <div key={tc._id || index} style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                <SampleBox title={`Sample Input ${index + 1}`}  content={tc.input} />
                <SampleBox title={`Sample Output ${index + 1}`} content={tc.expectedOutput} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
