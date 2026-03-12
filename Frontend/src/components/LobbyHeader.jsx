import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ieeeLogo from '../assets/ieee-logo.png';

const PRIMARY = "#006199";

export default function LobbyHeader() {
  const navigate = useNavigate();
  const student = JSON.parse(localStorage.getItem('student') || '{}');
  const [avatarHover, setAvatarHover] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.clear();
      navigate('/');
    }
  };

  const initials = student.fullName
    ? student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'S';

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 32px",
        height: "64px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 30,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        fontFamily: "Space Grotesk, sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <img
          src={ieeeLogo}
          alt="IEEE SUTECH"
          style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
        />
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "800",
              color: "#1e293b",
              letterSpacing: "-0.01em",
              lineHeight: "1.2",
            }}
          >
            IEEE SUTECH Programming Contest 2026
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              fontWeight: "600",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Round 1: Mar 12  ·  Round 2: Mar 19, 2026
          </div>
        </div>
      </div>

      {/* Right: Student info + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ textAlign: "right", lineHeight: "1.3" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#1e293b",
            }}
          >
            {student.fullName || 'Student Name'}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              fontWeight: "600",
            }}
          >
            {student.universityId || 'ID'}
          </div>
        </div>
        <button
          onClick={handleLogout}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: avatarHover ? "#dc2626" : PRIMARY,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
          title="Logout"
        >
          <span
            style={{
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {avatarHover ? (
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>logout</span>
            ) : (
              initials
            )}
          </span>
        </button>
      </div>
    </header>
  );
}
