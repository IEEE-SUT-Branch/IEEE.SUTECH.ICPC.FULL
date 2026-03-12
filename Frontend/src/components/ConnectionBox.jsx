import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PRIMARY = "#006199";

export default function ConnectionBox({ isServerReady, canEnter, agreed }) {
  const navigate = useNavigate();
  const [hint, setHint] = useState('');

  const handleEnter = () => {
    if (!isServerReady) return;

    if (!agreed) {
      setHint('Please confirm the anti-cheating rules first.');
      return;
    }

    setHint('');
    navigate('/arena');
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        height: "100%",
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      {/* Connection Status Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          border: "1px solid #e2e8f0",
          padding: "20px 22px",
        }}
      >
        <h4
          style={{
            fontSize: "10px",
            fontWeight: "700",
            color: "#94a3b8",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          Connection Status
        </h4>

        {/* Status Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "18px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isServerReady ? "#22c55e" : "#3b82f6",
              flexShrink: 0,
              animation: isServerReady ? "none" : "pulse 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#1d4ed8",
            }}
          >
            {isServerReady ? 'Server is ready.' : 'Waiting for server to start...'}
          </span>
        </div>

        {/* Status Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { label: "Network Latency", value: "24ms", color: "#16a34a" },
            { label: "Security Module",  value: "Verified", color: "#1e293b" },
            { label: "Camera Check",     value: "Active",   color: "#1e293b" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#64748b", fontWeight: "500" }}>{label}</span>
              <span style={{ color, fontWeight: "700" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proctor Note Card */}
      <div
        style={{
          background: `rgba(0, 97, 153, 0.05)`,
          borderRadius: "14px",
          border: `1px solid rgba(0,97,153,0.12)`,
          padding: "18px 20px",
          flex: 1,
        }}
      >
        <h4
          style={{
            fontSize: "10px",
            fontWeight: "700",
            color: PRIMARY,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
            info
          </span>
          Proctor Note
        </h4>
        <p
          style={{
            fontSize: "13px",
            color: "#475569",
            fontStyle: "italic",
            lineHeight: "1.6",
            margin: 0,
          }}
        >
          &ldquo;Please ensure your environment is quiet and your workspace is clear of any
          unauthorized materials before the session begins.&rdquo;
        </p>
      </div>

      {/* Enter Arena Button */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
        <button
          disabled={!canEnter}
          onClick={handleEnter}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "10px",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: canEnter ? "pointer" : "not-allowed",
            fontFamily: "Space Grotesk, sans-serif",
            transition: "all 0.2s",
            background: canEnter ? PRIMARY : "#e2e8f0",
            color: canEnter ? "#fff" : "#94a3b8",
            boxShadow: canEnter ? "0 4px 14px rgba(0,97,153,0.3)" : "none",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            play_circle
          </span>
          Enter Arena
        </button>
        <span
          style={{
            fontSize: "10px",
            fontWeight: "700",
            color: "#94a3b8",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {isServerReady
            ? agreed
              ? 'READY TO ENTER'
              : 'CHECK RULES TO ENTER'
            : 'Button will enable when server starts'}
        </span>
        {hint && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#dc2626',
              textAlign: 'center',
            }}
          >
            {hint}
          </span>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
