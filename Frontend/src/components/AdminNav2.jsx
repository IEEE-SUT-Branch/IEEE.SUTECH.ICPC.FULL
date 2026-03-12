import React, { useState } from "react";
import { logout } from "../api";

const PRIMARY = "#006199";

function AdminNav2({ status, onlineUsers }) {
  const [notifOpen, setNotifOpen] = useState(false);

  const handleEmergencyStop = () => {
    if (window.confirm("EMERGENCY STOP: This will immediately halt the contest for all participants. Are you sure?")) {
      // Emergency stop logic can be wired here
      alert("Emergency stop triggered.");
    }
  };

  return (
    <header
      style={{
        height: "64px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        fontFamily: "Space Grotesk, sans-serif",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left: Server Status + separator + Online Users */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Server Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
              animation: "pulseGreen 2s infinite",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#16a34a",
            }}
          >
            Healthy
          </span>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "20px", background: "#e2e8f0" }} />

        {/* Online Users */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ color: "#64748b", fontSize: "16px" }}>
            group
          </span>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
            {onlineUsers ?? 0} Online
          </span>
        </div>
      </div>

      {/* Right: Emergency Stop + Notifications */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Emergency Stop */}
        <button
          onClick={handleEmergencyStop}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.04em",
            cursor: "pointer",
            fontFamily: "Space Grotesk, sans-serif",
            textTransform: "uppercase",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
            emergency_home
          </span>
          Emergency Stop
        </button>

        {/* Notifications Bell */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "#475569", fontSize: "20px" }}>
              notifications
            </span>
            {/* Badge */}
            <span
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                background: "#ef4444",
                borderRadius: "50%",
                border: "2px solid #fff",
              }}
            />
          </button>

          {notifOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                width: "280px",
                padding: "12px",
                zIndex: 50,
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                Notifications
              </p>
              <div style={{ fontSize: "13px", color: "#64748b", padding: "12px 0", textAlign: "center" }}>
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            color: "#64748b",
            cursor: "pointer",
            fontFamily: "Space Grotesk, sans-serif",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            logout
          </span>
          Logout
        </button>
      </div>

      <style>{`
        @keyframes pulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </header>
  );
}

export default AdminNav2;
