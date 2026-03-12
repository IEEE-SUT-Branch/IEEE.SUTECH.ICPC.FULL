import React, { useState, useEffect, useCallback } from "react";
import AdminNav from "./AdminNav";
import AdminNav2 from "./AdminNav2";
import { ArrowDownToLine, RefreshCw } from "lucide-react";
import api from "../api";

const PRIMARY = "#006199";
const PROBLEMS = ["A", "B", "C", "D", "E"];
const LABS = ["All Labs", "Lab 6", "Lab 7", "Lab 123"];
const YEARS = ["All Years", "2021", "2022", "2023", "2024", "2025", "2026"];
const PAGE_SIZE = 15;

// ── Problem Cell ──────────────────────────────────────────────────────────────
function ProblemCell({ data, letter }) {
  if (!data || (!data.solved && data.attempts === 0)) {
    return (
      <td style={{ padding: "12px 6px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex", flexDirection: "column", alignItems: "center",
            background: "#f1f5f9", borderRadius: "6px",
            padding: "3px 8px", minWidth: "36px",
          }}
        >
          <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>{letter}</span>
          <span style={{ fontSize: "9px", color: "#cbd5e1" }}>—</span>
        </div>
      </td>
    );
  }

  if (data.solved) {
    return (
      <td style={{ padding: "12px 6px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex", flexDirection: "column", alignItems: "center",
            background: data.isFirstBlood ? "transparent" : "#f0fdf4",
            border: data.isFirstBlood ? "2px solid #f59e0b" : "1px solid #bbf7d0",
            borderRadius: "6px", padding: "3px 8px", minWidth: "36px",
            boxShadow: data.isFirstBlood ? "0 0 8px rgba(245,158,11,0.4)" : "none",
          }}
        >
          <span style={{ fontSize: "10px", color: data.isFirstBlood ? "#b45309" : "#16a34a", fontWeight: "800" }}>{letter}</span>
          <span style={{ fontSize: "9px", color: data.isFirstBlood ? "#d97706" : "#22c55e", fontWeight: "600" }}>
            +{data.acceptedAt}m
          </span>
          {data.attempts > 1 && (
            <span style={{ fontSize: "8px", color: "#94a3b8" }}>({data.attempts})</span>
          )}
        </div>
      </td>
    );
  }

  return (
    <td style={{ padding: "12px 6px", textAlign: "center" }}>
      <div
        style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center",
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: "6px", padding: "3px 8px", minWidth: "36px",
        }}
      >
        <span style={{ fontSize: "10px", color: "#b91c1c", fontWeight: "800" }}>{letter}</span>
        <span style={{ fontSize: "9px", color: "#ef4444", fontWeight: "600" }}>-{data.attempts}</span>
      </div>
    </td>
  );
}

// ── Avatar Initials ───────────────────────────────────────────────────────────
function Avatar({ name, rank }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';
  const colors = ["#006199", "#16a34a", "#b45309", "#7c3aed", "#be185d"];
  const bg = colors[(rank - 1) % colors.length] || PRIMARY;
  return (
    <div
      style={{
        width: "32px", height: "32px", borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "11px", fontWeight: "800", color: "#fff" }}>{initials}</span>
    </div>
  );
}

// ── Rank Badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: "20px" }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: "20px" }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: "20px" }}>🥉</span>;
  return (
    <span style={{ fontSize: "16px", fontWeight: "800", color: "#475569" }}>
      #{rank}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminStandings() {
  const [standings, setStandings]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [exporting, setExporting]     = useState(false);
  const [exportError, setExportError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLive, setIsLive]           = useState(true);

  // Filters
  const [labFilter, setLabFilter]       = useState("All Labs");
  const [yearFilter, setYearFilter]     = useState("All Years");
  const [minScore, setMinScore]         = useState("");
  const [page, setPage]                 = useState(1);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (labFilter !== "All Labs")   params.set("lab", labFilter);
      if (yearFilter !== "All Years") params.set("year", yearFilter);
      if (minScore)                   params.set("minSolved", minScore);

      const res = await api.get(`/standings?${params}`);
      const data = res.data;
      if (!data.success) throw new Error(data.message || "Failed to load standings.");
      setStandings(data.data);
      setLastRefresh(new Date());
      setPage(1);
    } catch (err) {
      if (err.response?.status === 404) {
        setStandings([]);
      } else {
        setError(err.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [labFilter, yearFilter, minScore]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live polling every 15s
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [isLive, fetchData]);

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

  const clearFilters = () => { setLabFilter("All Labs"); setYearFilter("All Years"); setMinScore(""); };

  // Pagination
  const totalPages  = Math.ceil(standings.length / PAGE_SIZE);
  const pageData    = standings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const totalTeams  = standings.length;
  const totalSolved = standings.reduce((sum, s) => sum + s.totalSolved, 0);

  // Problem difficulty stats (% solved per problem)
  const probStats = PROBLEMS.map(letter => {
    const solved = standings.filter(s => s.problems?.[letter]?.solved).length;
    return { letter, solved, pct: totalTeams > 0 ? Math.round((solved / totalTeams) * 100) : 0 };
  });

  // Recent activity
  const recentActivity = standings
    .flatMap(s =>
      PROBLEMS
        .filter(l => s.problems?.[l]?.solved)
        .map(l => ({
          name: s.fullName,
          letter: l,
          time: s.problems[l].acceptedAt,
          rank: s.rank,
        }))
    )
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);

  const timeStr = `${String(Math.floor(elapsed / 3600)).padStart(2, '0')}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const inputStyle = {
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    padding: "7px 12px",
    fontSize: "12px",
    outline: "none",
    fontFamily: "Space Grotesk, sans-serif",
    color: "#1e293b",
    background: "#fff",
    cursor: "pointer",
  };

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

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Bar */}
        <AdminNav2 onlineUsers={totalTeams} />

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* Page Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", margin: 0 }}>Live ICPC Standings</h1>
                {isLive && (
                  <span
                    style={{
                      background: "#fef2f2", color: "#b91c1c",
                      fontSize: "10px", fontWeight: "800", padding: "3px 8px",
                      borderRadius: "20px", letterSpacing: "0.08em",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
                    LIVE
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                Updated {lastRefresh.toLocaleTimeString()} · Session timer: <strong style={{ color: PRIMARY }}>{timeStr}</strong>
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={fetchData}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "8px",
                  background: "#fff", color: "#475569", cursor: "pointer",
                  fontSize: "12px", fontWeight: "600", fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                <RefreshCw size={13} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "8px 14px", border: `1px solid ${PRIMARY}`, borderRadius: "8px",
                  background: "#fff", color: PRIMARY, cursor: "pointer",
                  fontSize: "12px", fontWeight: "600", fontFamily: "Space Grotesk, sans-serif",
                  opacity: exporting ? 0.7 : 1,
                }}
              >
                <ArrowDownToLine size={13} />
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
              {exportError && <p style={{ color: "#ef4444", fontSize: "12px" }}>{exportError}</p>}
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Total Teams",   value: totalTeams,  icon: "groups",        bg: "#dbeafe", ic: PRIMARY   },
              { label: "Total Solved",  value: totalSolved, icon: "emoji_events",  bg: "#dcfce7", ic: "#16a34a" },
              { label: "System Load",   value: "Normal",    icon: "speed",         bg: "#f0fdf4", ic: "#16a34a" },
            ].map(({ label, value, icon, bg, ic }) => (
              <div key={label} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: ic, fontSize: "20px" }}>{icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{label}</p>
                  <p style={{ fontSize: "22px", fontWeight: "800", color: "#1e293b", margin: "2px 0 0" }}>
                    {loading ? <span style={{ color: "#e2e8f0" }}>…</span> : value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
            <select value={labFilter}  onChange={e => setLabFilter(e.target.value)}  style={inputStyle}>
              {LABS.map(l  => <option key={l}  value={l}>{l}</option>)}
            </select>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={inputStyle}>
              {YEARS.map(y => <option key={y}  value={y}>{y}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", ...inputStyle }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Min Solved:</span>
              <input
                type="number" min={0} max={5}
                value={minScore}
                onChange={e => setMinScore(e.target.value)}
                placeholder="Any"
                style={{ width: "48px", border: "none", outline: "none", fontSize: "12px", fontFamily: "Space Grotesk, sans-serif", color: "#1e293b" }}
              />
            </div>
            <button
              onClick={clearFilters}
              style={{ fontSize: "12px", fontWeight: "700", color: "#14b8a6", background: "none", border: "none", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif" }}
            >
              Clear all filters
            </button>
            <button
              onClick={() => setIsLive(!isLive)}
              style={{
                marginLeft: "auto",
                display: "flex", alignItems: "center", gap: "5px",
                padding: "7px 12px", borderRadius: "8px",
                border: `1px solid ${isLive ? "#bbf7d0" : "#e2e8f0"}`,
                background: isLive ? "#f0fdf4" : "#fff",
                color: isLive ? "#16a34a" : "#64748b",
                fontSize: "11px", fontWeight: "700", cursor: "pointer",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isLive ? "#22c55e" : "#94a3b8", display: "inline-block" }} />
              {isLive ? "Live Auto-refresh ON" : "Live Off"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: "14px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "13px", borderRadius: "8px" }}>
              {error}
            </div>
          )}

          {/* Standings Table */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <tr>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Rank</th>
                    <th style={{ padding: "10px 12px", textAlign: "left",   fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Competitor</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Lab</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Solved</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Penalty</th>
                    {PROBLEMS.map(p => (
                      <th key={p} style={{ padding: "10px 6px", textAlign: "center", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Loading standings…</td></tr>
                  )}
                  {!loading && standings.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No standings available. The contest may not have started yet.</td></tr>
                  )}
                  {!loading && pageData.map((entry) => (
                    <tr
                      key={entry.studentId}
                      style={{
                        borderBottom: "1px solid #f8fafc",
                        background: entry.isDisqualified ? "#fef2f2" : "transparent",
                        opacity: entry.isDisqualified ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (!entry.isDisqualified) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = entry.isDisqualified ? "#fef2f2" : ""; }}
                    >
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <RankBadge rank={entry.rank} />
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Avatar name={entry.fullName} rank={entry.rank} />
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>{entry.fullName}</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>{entry.universityId}</div>
                            {entry.isDisqualified && (
                              <div style={{ fontSize: "9px", color: "#ef4444", fontWeight: "800", textTransform: "uppercase" }}>Disqualified</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>
                          {entry.labAssignment}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                        {entry.totalSolved}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                        {entry.totalPenalty}
                      </td>
                      {PROBLEMS.map(letter => (
                        <ProblemCell key={letter} data={entry.problems?.[letter]} letter={letter} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, standings.length)} of {standings.length}
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "12px", color: "#475569", opacity: page === 1 ? 0.5 : 1, fontFamily: "Space Grotesk, sans-serif" }}
                  >
                    Prev
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      style={{
                        padding: "5px 10px", borderRadius: "6px",
                        border: `1px solid ${page === i + 1 ? PRIMARY : "#e2e8f0"}`,
                        background: page === i + 1 ? PRIMARY : "#fff",
                        color: page === i + 1 ? "#fff" : "#475569",
                        cursor: "pointer", fontSize: "12px", fontFamily: "Space Grotesk, sans-serif",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: "12px", color: "#475569", opacity: page === totalPages ? 0.5 : 1, fontFamily: "Space Grotesk, sans-serif" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom section: Problem Analysis + Activity Log */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            {/* Problem Difficulty Analysis */}
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <span className="material-symbols-outlined" style={{ color: PRIMARY, fontSize: "18px" }}>bar_chart</span>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Problem Difficulty Analysis</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {probStats.map(({ letter, solved, pct }) => (
                  <div key={letter}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Problem {letter}</span>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>
                        {solved}/{totalTeams} <span style={{ color: "#94a3b8", fontWeight: "500" }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: pct > 60 ? "#22c55e" : pct > 30 ? "#f59e0b" : "#ef4444",
                          borderRadius: "6px",
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Log */}
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <span className="material-symbols-outlined" style={{ color: PRIMARY, fontSize: "18px" }}>history</span>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Recent Solves</h3>
              </div>
              {recentActivity.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
                  No solves yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
                  {recentActivity.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 10px", background: "#f8fafc", borderRadius: "8px",
                        borderLeft: `3px solid ${PRIMARY}`,
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>{item.name}</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "6px" }}>solved Problem {item.letter}</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", whiteSpace: "nowrap" }}>
                        +{item.time}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
