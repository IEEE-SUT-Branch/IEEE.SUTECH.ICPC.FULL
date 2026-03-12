import React from 'react';

const PRIMARY = "#006199";

export default function RulesPanel({ agreed, setAgreed }) {
  const rules = [
    {
      icon: "tab_unselected",
      title: "Environment Lockdown",
      description:
        "The browser must remain in focus. Tab switching or minimizing the window will trigger an immediate disqualification warning.",
    },
    {
      icon: "smart_toy",
      title: "Zero AI Assistance",
      description:
        "Use of ChatGPT, GitHub Copilot, or any other AI-based code generation tools is strictly prohibited.",
    },
    {
      icon: "group_off",
      title: "Solo Performance",
      description:
        "No communication with other participants or external entities during the 4-hour session.",
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        border: "1px solid #e2e8f0",
        padding: "28px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Space Grotesk, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ color: PRIMARY, fontSize: "22px" }}
        >
          gavel
        </span>
        <h3
          style={{
            fontSize: "15px",
            fontWeight: "700",
            color: "#1e293b",
            margin: 0,
          }}
        >
          Contest Instructions &amp; Anti-Cheating Rules
        </h3>
      </div>

      {/* Rule Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
        {rules.map((rule) => (
          <div
            key={rule.title}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "14px 16px",
              background: "#f8fafc",
              borderRadius: "10px",
              borderLeft: `4px solid ${PRIMARY}`,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: PRIMARY,
                fontSize: "22px",
                flexShrink: 0,
                marginTop: "1px",
              }}
            >
              {rule.icon}
            </span>
            <div>
              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#1e293b",
                  margin: "0 0 4px 0",
                }}
              >
                {rule.title}
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                {rule.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Agreement Checkbox */}
      <label
        onClick={() => setAgreed((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          cursor: "pointer",
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "5px",
            border: `2px solid ${agreed ? PRIMARY : "#cbd5e1"}`,
            background: agreed ? PRIMARY : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "1px",
            transition: "all 0.15s",
            cursor: "pointer",
          }}
        >
          {agreed && (
            <span
              className="material-symbols-outlined"
              style={{ color: "#fff", fontSize: "14px" }}
            >
              check
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#475569",
            lineHeight: "1.5",
          }}
        >
          I have read, understood, and agree to abide by all the anti-cheating rules
          mentioned above.
        </span>
      </label>
    </div>
  );
}
