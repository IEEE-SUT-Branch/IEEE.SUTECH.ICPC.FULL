import React, { useEffect, useState, useCallback } from "react";
import AdminNav from "./AdminNav";
import AdminNav2 from "./AdminNav2";
import { ArrowDownToLine, ChevronDown, Users, Trophy, Clock, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import api from "../api";

const PRIMARY = "#006199";
const EVENT_LABELS = {
  tab_switch:      { type: "violation", title: "Tab Switch Detected" },
  window_blur:     { type: "violation", title: "Window Focus Lost"   },
  fullscreen_exit: { type: "violation", title: "Fullscreen Exit"     },
  paste_attempt:   { type: "warning",   title: "Paste Attempt"       },
  copy_attempt:    { type: "warning",   title: "Copy Attempt"        },
  idle_timeout:    { type: "info",      title: "Student Idle"        },
  warning_sent:    { type: "warning",   title: "Warning Issued"      },
  penalty_added:   { type: "warning",   title: "Penalty Added"       },
  disqualified:    { type: "violation", title: "Disqualified"        },
};

// ── Problem cell ──────────────────────────────────────────────────────────────
function ProblemCell({ data }) {
  if (!data) {
    return (
      <td style={{ padding: "14px 8px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#f1f5f9", color: "#94a3b8", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "700" }}>
          —
        </div>
      </td>
    );
  }

  if (data.solved) {
    return (
      <td style={{ padding: "14px 8px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#22c55e", color: "#fff", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "700", lineHeight: "1.4" }}>
          <div style={{ fontSize: "10px", opacity: 0.9 }}>Solved</div>
          <div style={{ fontSize: "9px", opacity: 0.8 }}>+{data.acceptedAt}m</div>
        </div>
      </td>
    );
  }

  if (data.attempts > 0) {
    return (
      <td style={{ padding: "14px 8px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#ef4444", color: "#fff", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "700", lineHeight: "1.4" }}>
          <div style={{ fontSize: "10px", opacity: 0.9 }}>Failed</div>
          <div style={{ fontSize: "9px", opacity: 0.8 }}>{data.attempts} tries</div>
        </div>
      </td>
    );
  }

  return (
    <td style={{ padding: "14px 8px", textAlign: "center" }}>
      <div style={{ display: "inline-block", background: "#f1f5f9", color: "#94a3b8", borderRadius: "6px", padding: "3px 8px", fontSize: "11px" }}>
        —
      </div>
    </td>
  );
}

// ── Contest status badge ──────────────────────────────────────────────────────
function ContestStatusBadge({ status }) {
  const map = {
    running:     { bg: "#dcfce7", color: "#16a34a", icon: <Wifi size={12} />,    label: "Live"        },
    paused:      { bg: "#fef9c3", color: "#ca8a04", icon: <Clock size={12} />,   label: "Paused"      },
    not_started: { bg: "#f1f5f9", color: "#64748b", icon: <WifiOff size={12} />, label: "Not Started" },
    ended:       { bg: "#fee2e2", color: "#dc2626", icon: <WifiOff size={12} />, label: "Ended"       },
  };
  const s = map[status] ?? map.not_started;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      {s.icon}{s.label}
    </span>
  );
}

// ── Lab Card ──────────────────────────────────────────────────────────────────
function LabCard({ lab }) {
  const isActive = lab.connections > 0;
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>{lab.name}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: isActive ? "#dcfce7" : "#f1f5f9", color: isActive ? "#16a34a" : "#94a3b8", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isActive ? "#22c55e" : "#cbd5e1", display: "inline-block" }} />
          {isActive ? "Online" : "Offline"}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
        <span>Online: <strong style={{ color: isActive ? "#16a34a" : "#94a3b8" }}>{lab.connections}/{lab.total}</strong></span>
        <span>Server: <strong style={{ color: "#1e293b" }}>{lab.latency}</strong></span>
      </div>
    </div>
  );
}

// ── Alert Item ────────────────────────────────────────────────────────────────
function AlertItem({ alert }) {
  const colorMap = {
    warning: { border: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
    violation: { border: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
    info: { border: PRIMARY, bg: `rgba(0,97,153,0.05)`, text: PRIMARY },
  };
  const style = colorMap[alert.type] || colorMap.info;
  return (
    <div style={{ borderLeft: `3px solid ${style.border}`, background: style.bg, padding: "10px 12px", borderRadius: "6px", marginBottom: "8px" }}>
      <div style={{ fontSize: "12px", fontWeight: "700", color: style.text }}>{alert.title}</div>
      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{alert.desc}</div>
      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>{alert.time}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  const [standings, setStandings]   = useState([]);
  const [contest, setContest]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [exporting, setExporting]   = useState(false);
  const [exportError, setExportError] = useState(null);

  const [labFilter, setLabFilter]           = useState("all");
  const [minSolvedFilter, setMinSolvedFilter] = useState("");
  const [labOpen, setLabOpen]               = useState(false);

  const LABS     = ["Lab 6", "Lab 7", "Lab 123"];
  const PROBLEMS = ["A", "B", "C", "D", "E"];

  const [labCards, setLabCards] = useState(
    LABS.map(name => ({ name, connections: 0, total: 0, latency: "—" }))
  );
  const [alerts, setAlerts] = useState([]);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (labFilter !== "all")    params.set("lab", labFilter);
      if (minSolvedFilter !== "") params.set("minSolved", minSolvedFilter);

      try {
        const contestRes = await api.get('/contests/active');
        if (contestRes.data.success) setContest(contestRes.data.data);
      } catch { /* no active contest */ }

      try {
        const standingsRes = await api.get(`/standings?${params}`);
        const standingsData = standingsRes.data;
        if (!standingsData.success) throw new Error(standingsData.message || "Failed to load standings.");
        setStandings(standingsData.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setStandings([]);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      }

      // ── Lab Connectivity + Live Alerts (real monitoring data) ──────────────
      try {
        const t0 = Date.now();
        const [overviewRes, studentsRes] = await Promise.all([
          api.get('/monitor/overview'),
          api.get('/monitor/students'),
        ]);
        const serverMs    = Date.now() - t0;
        const overview    = overviewRes.data.data || {};
        const allStudents = studentsRes.data.data || [];

        // Count students per lab (online = online or idle)
        const labMap = {};
        ["Lab 6", "Lab 7", "Lab 123"].forEach(lab => { labMap[lab] = { total: 0, online: 0 }; });
        allStudents.forEach(s => {
          const lab = s.labAssignment;
          if (labMap[lab]) {
            labMap[lab].total++;
            if (s.status === "online" || s.status === "idle") labMap[lab].online++;
          }
        });
        setLabCards(["Lab 6", "Lab 7", "Lab 123"].map(name => ({
          name,
          connections: labMap[name]?.online || 0,
          total:       labMap[name]?.total  || 0,
          latency:     `${serverMs}ms`,
        })));

        // Map recentAlerts → alert format
        const timeAgo = (iso) => {
          const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
          return mins < 1 ? "just now" : mins === 1 ? "1 min ago" : `${mins} min ago`;
        };
        const raw = overview.recentAlerts || [];
        setAlerts(raw.map(log => {
          const cfg  = EVENT_LABELS[log.eventType] || { type: "info", title: log.eventType };
          const name = log.studentId?.fullName || "Unknown";
          const lab  = log.studentId?.labAssignment || "";
          return { type: cfg.type, title: cfg.title, desc: `${name} — ${lab}`, time: timeAgo(log.createdAt) };
        }));
      } catch { /* monitoring API unavailable — keep previous data */ }

    } finally {
      setLoading(false);
    }
  }, [labFilter, minSolvedFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (contest?.status !== "running") return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [contest?.status, fetchData]);

  // Always refresh monitoring panel every 15 s regardless of contest state
  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const res  = await api.get('/standings/export', { responseType: 'blob' });
      const blob = res.data;
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", "standings.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.response?.data?.message || err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => { setLabFilter("all"); setMinSolvedFilter(""); };

  const totalContestants = standings.length;
  const totalSolved      = standings.reduce((sum, s) => sum + s.totalSolved, 0);
  const activeWarnings   = standings.filter(s => s.warnings > 0).length;

  const statCards = [
    { label: "Total Solved",     value: totalSolved,      icon: "emoji_events",  bg: "#dcfce7", iconColor: "#16a34a" },
    { label: "Active Warnings",  value: activeWarnings,   icon: "warning",       bg: "#fef9c3", iconColor: "#ca8a04" },
    { label: "Contestants",      value: totalContestants, icon: "group",         bg: "#dbeafe", iconColor: PRIMARY   },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f5f7f8",
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      {/* Sidebar */}
      <AdminNav />

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Bar */}
        <AdminNav2 status={contest?.status} onlineUsers={totalContestants} />

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* Page Title */}
          <div style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", margin: 0 }}>Overview</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px" }}>Real-time contest monitoring dashboard</p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {statCards.map(({ label, value, icon, bg, iconColor }) => (
              <div key={label} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: "22px" }}>{icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{label}</p>
                  <p style={{ fontSize: "24px", fontWeight: "800", color: "#1e293b", margin: "2px 0 0" }}>
                    {loading ? <span style={{ color: "#e2e8f0" }}>…</span> : value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Contest Status Card */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Contest Status</h3>
              {loading ? null : contest ? <ContestStatusBadge status={contest.status} /> : <span style={{ fontSize: "12px", color: "#94a3b8" }}>No active contest</span>}
            </div>
            {/* Contest Controls */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {[
                { label: "Start Contest", icon: "play_arrow", bg: "#16a34a", action: () => alert("Start clicked") },
                { label: "Pause Contest", icon: "pause",      bg: "#ca8a04", action: () => alert("Pause clicked") },
                { label: "End Contest",   icon: "stop",       bg: "#dc2626", action: () => alert("End clicked")   },
              ].map(({ label, icon, bg, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px", background: bg, color: "#fff",
                    border: "none", borderRadius: "8px", fontSize: "13px",
                    fontWeight: "700", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Two-column section: Lab Connectivity + Cheating Alerts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", marginBottom: "24px" }}>
            {/* Lab Connectivity */}
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "14px", margin: "0 0 14px" }}>Lab Connectivity Status</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {labCards.map(lab => <LabCard key={lab.name} lab={lab} />)}
              </div>
            </div>

            {/* Cheating Alerts */}
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444", fontSize: "18px" }}>security</span>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Live Alerts</h3>
              </div>
              <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                {alerts.length === 0
                  ? <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "20px 0", margin: 0 }}>No alerts yet</p>
                  : alerts.map((alert, i) => <AlertItem key={i} alert={alert} />)
                }
              </div>
            </div>
          </div>

          {/* Standings Table */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {/* Table Header Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Live Standings</h3>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Lab filter */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setLabOpen(p => !p)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      border: "1px solid #e2e8f0", borderRadius: "8px",
                      padding: "7px 12px", fontSize: "13px", fontWeight: "600",
                      color: "#475569", background: "#fff", cursor: "pointer",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    <ChevronDown size={14} />
                    {labFilter === "all" ? "All Labs" : labFilter}
                  </button>
                  {labOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0,
                      background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 10, minWidth: "130px", overflow: "hidden",
                    }}>
                      <button onClick={() => { setLabFilter("all"); setLabOpen(false); }}
                        style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: "13px", background: labFilter === "all" ? `rgba(0,97,153,0.07)` : "#fff", color: labFilter === "all" ? PRIMARY : "#475569", border: "none", cursor: "pointer", fontWeight: labFilter === "all" ? "700" : "500", fontFamily: "Space Grotesk, sans-serif" }}>
                        All Labs
                      </button>
                      {LABS.map(lab => (
                        <button key={lab} onClick={() => { setLabFilter(lab); setLabOpen(false); }}
                          style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: "13px", background: labFilter === lab ? `rgba(0,97,153,0.07)` : "#fff", color: labFilter === lab ? PRIMARY : "#475569", border: "none", cursor: "pointer", fontWeight: labFilter === lab ? "700" : "500", fontFamily: "Space Grotesk, sans-serif" }}>
                          {lab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export */}
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    border: `1px solid ${PRIMARY}`, borderRadius: "8px",
                    padding: "7px 12px", fontSize: "13px", fontWeight: "600",
                    color: PRIMARY, background: "#fff", cursor: "pointer",
                    fontFamily: "Space Grotesk, sans-serif", opacity: exporting ? 0.6 : 1,
                  }}
                >
                  <ArrowDownToLine size={14} />
                  {exporting ? "Exporting…" : "Export CSV"}
                </button>
                {exportError && <p style={{ color: "#ef4444", fontSize: "12px" }}>{exportError}</p>}

                <button onClick={clearFilters} style={{ fontSize: "13px", fontWeight: "600", color: "#14b8a6", background: "none", border: "none", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif" }}>
                  Clear filters
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin: "12px 20px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "13px", borderRadius: "8px" }}>
                {error}
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <tr>
                    {["Rank", "Competitor", "Lab", "Solved", "Penalty", ...PROBLEMS].map(h => (
                      <th key={h} style={{ padding: "10px 10px", textAlign: h === "Competitor" ? "left" : "center", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Loading standings…</td></tr>
                  )}
                  {!loading && standings.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No standings found.</td></tr>
                  )}
                  {!loading && standings.map((entry) => (
                    <tr
                      key={entry.studentId}
                      style={{ borderBottom: "1px solid #f8fafc", opacity: entry.isDisqualified ? 0.4 : 1 }}
                    >
                      <td style={{ padding: "14px 10px", textAlign: "center" }}>
                        <span style={{ fontSize: "18px", fontWeight: "800", color: entry.rank <= 3 ? PRIMARY : "#1e293b" }}>{entry.rank}</span>
                      </td>
                      <td style={{ padding: "14px 10px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", margin: 0 }}>{entry.fullName}</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>{entry.universityId}</p>
                        {entry.isDisqualified && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "700" }}>Disqualified</span>}
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "center" }}>
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>{entry.labAssignment}</span>
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "center", fontSize: "14px", fontWeight: "800", color: "#1e293b" }}>{entry.totalSolved}</td>
                      <td style={{ padding: "14px 10px", textAlign: "center", fontSize: "13px", color: "#64748b" }}>{entry.totalPenalty}</td>
                      {PROBLEMS.map(letter => (
                        <ProblemCell key={letter} data={entry.problems?.[letter]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
