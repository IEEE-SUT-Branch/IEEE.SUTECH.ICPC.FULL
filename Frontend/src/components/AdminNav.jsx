import React from 'react';
import { Link } from 'react-router';
import ieeeLogo from '../assets/ieee-logo.png';

const PRIMARY = "#006199";

const NAV_ITEMS = [
  { path: '/admin/dashboard',   icon: 'dashboard',   label: 'Overview'     },
  { path: '/admin/problems',    icon: 'exercise',    label: 'Problems'     },
  { path: '/admin/monitoring',  icon: 'monitoring',  label: 'Monitoring'   },
  { path: '/admin/standings',   icon: 'leaderboard', label: 'Standings'    },
  { path: '/admin/addtime',     icon: 'send',        label: 'Submissions'  },
];

function AdminNav() {
  const currentPath = window.location.pathname;

  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const adminName = admin.username || 'Admin';
  const adminEmail = admin.email || 'admin@sut.edu.eg';

  return (
    <nav
      style={{
        width: "256px",
        minWidth: "256px",
        height: "100vh",
        background: "#fff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        fontFamily: "Space Grotesk, sans-serif",
        overflowY: "auto",
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      {/* Brand Area */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <img
          src={ieeeLogo}
          alt="IEEE SUTECH"
          style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
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
            IEEE SUTECH
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: `rgba(0,97,153,0.7)`,
            }}
          >
            Admin Dashboard
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div
        style={{
          flex: 1,
          padding: "12px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const isActive = currentPath === path || currentPath.startsWith(path + '/');
          return (
            <Link
              key={path}
              to={path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: isActive ? "700" : "600",
                background: isActive ? PRIMARY : "transparent",
                color: isActive ? "#fff" : "#475569",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = `rgba(0,97,153,0.06)`;
                  e.currentTarget.style.color = PRIMARY;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#475569";
                }
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px" }}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Bottom: User Info */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: `rgba(0,97,153,0.1)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: PRIMARY, fontSize: "18px" }}
          >
            person
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#1e293b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {adminName}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {adminEmail}
          </div>
        </div>
        <Link
          to="/admin/settings"
          style={{ color: "#94a3b8", textDecoration: "none", flexShrink: 0 }}
          title="Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            settings
          </span>
        </Link>
      </div>
    </nav>
  );
}

export default AdminNav;
