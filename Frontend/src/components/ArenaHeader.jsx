import React, { useState, useEffect } from 'react';
import { useTime } from './TimeContext';
import ieeeLogo from '../assets/ieee-logo.png';

const PRIMARY = "#006199";

const RollDigit = ({ value }) => {
  return (
    <div style={{ position: "relative", display: "inline-block", height: "20px", overflow: "hidden", verticalAlign: "middle", width: "0.65em" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
          transition: "transform 500ms ease-in-out",
          transform: `translateY(-${(9 - value) * 20}px)`,
        }}
      >
        {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((num) => (
          <span key={num} style={{ height: "20px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {num}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function ArenaHeader({ isContestOver }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { contest, timeleft } = useTime();
  const student = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const contestIsActive =
    contest && (contest.status === 'running' || contest.status === 'paused');
  const timeLeft = contestIsActive ? Math.max(0, timeleft) : 0;

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  const isLow = timeLeft > 0 && timeLeft <= 600;
  const timerBg    = isLow ? "#fef2f2" : "#f0fdf4";
  const timerColor = isLow ? "#dc2626"  : "#16a34a";
  const timerBorder = isLow ? "#fecaca" : "#bbf7d0";

  const initials = student.fullName
    ? student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'S';

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        height: "56px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        fontFamily: "Space Grotesk, sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Left: Brand + Separator + Timer */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <img
          src={ieeeLogo}
          alt="IEEE SUTECH"
          style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
        />

        {/* Title */}
        <span style={{ fontSize: "15px", fontWeight: "800", color: "#1e293b", letterSpacing: "-0.01em" }}>
          IEEE SUTECH
        </span>

        {/* Separator */}
        <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />

        {/* Timer Chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "20px",
            background: timerBg,
            border: `1px solid ${timerBorder}`,
            fontSize: "14px",
            fontWeight: "800",
            color: timerColor,
            letterSpacing: "0.05em",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>timer</span>
          <div style={{ display: "flex", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>
            <RollDigit value={Number(mStr[0])} />
            <RollDigit value={Number(mStr[1])} />
            <span style={{ margin: "0 1px", paddingBottom: "1px" }}>:</span>
            <RollDigit value={Number(sStr[0])} />
            <RollDigit value={Number(sStr[1])} />
          </div>
        </div>
      </div>

      {/* Right: Online status + User Card + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Online Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "20px",
            border: `1px solid ${isOnline ? "#bbf7d0" : "#e2e8f0"}`,
            background: isOnline ? "#f0fdf4" : "#f8fafc",
            fontSize: "11px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: isOnline ? "#16a34a" : "#94a3b8",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isOnline ? "#22c55e" : "#94a3b8",
              display: "inline-block",
            }}
          />
          {isOnline ? 'Online' : 'Offline'}
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />

        {/* User Info Card */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ textAlign: "right", lineHeight: "1.3" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
              {student.fullName || "Student Name"}
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>
              {student.universityId || "ID"}
            </div>
          </div>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: `rgba(0,97,153,0.1)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid rgba(0,97,153,0.2)`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: "800", color: PRIMARY }}>{initials}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          disabled={!isContestOver}
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            background: isContestOver ? "#fef2f2" : "transparent",
            color: isContestOver ? "#dc2626" : "#94a3b8",
            cursor: isContestOver ? "pointer" : "not-allowed",
            fontSize: "12px",
            fontWeight: "700",
            fontFamily: "Space Grotesk, sans-serif",
            opacity: isContestOver ? 1 : 0.6,
            transition: "all 0.15s",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>logout</span>
          Logout
        </button>
      </div>
    </header>
  );
}
