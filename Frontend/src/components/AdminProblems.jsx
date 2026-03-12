import React, { useEffect, useState } from "react";
import AdminNav from "./AdminNav";
import AdminNav2 from "./AdminNav2";
import { Plus, X } from "lucide-react";
import { Link } from "react-router";
import api from "../api";

const PRIMARY = "#006199";

// ── Difficulty Badge ──────────────────────────────────────────────────────────
function DifficultyBadge({ status }) {
  const cfg = {
    easy:   { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    medium: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    hard:   { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  };
  const s = cfg[status] ?? { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontSize: "11px",
        fontWeight: "700",
        padding: "3px 10px",
        borderRadius: "20px",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isPublished = status === "published";
  return (
    <span
      style={{
        background: isPublished ? "#dbeafe" : "#f1f5f9",
        color: isPublished ? "#1d4ed8" : "#64748b",
        fontSize: "11px",
        fontWeight: "700",
        padding: "3px 10px",
        borderRadius: "20px",
        display: "inline-block",
      }}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

// ── Filter Tabs ───────────────────────────────────────────────────────────────
const FILTER_TABS = ["All Problems", "Published", "Drafts"];

// ── Main Component ────────────────────────────────────────────────────────────
function AdminProblems() {
  const [problems, setProblems]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState(null);
  const [filterTab, setFilterTab]     = useState("All Problems");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit panel state
  const [editingId, setEditingId]       = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [saveLoading, setSaveLoading]   = useState(false);
  const [saveError, setSaveError]       = useState(null);
  const [saveSuccess, setSaveSuccess]   = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);

  // ── Fetch all problems ──────────────────────────────────────────────────────
  const fetchProblems = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res  = await api.get('/problems');
      const data = res.data;
      if (!data.success) throw new Error(data.message || "Failed to load problems.");
      setProblems(data.data);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProblems(); }, []);

  // ── Open edit panel ─────────────────────────────────────────────────────────
  const openEdit = (problem) => {
    setEditingId(problem._id);
    setEditForm({
      title:             problem.title             ?? "",
      description:       problem.description       ?? "",
      inputDescription:  problem.inputDescription  ?? "",
      outputDescription: problem.outputDescription ?? "",
      checkerMode:       problem.checker?.mode     ?? "token",
      difficulty:        problem.difficulty        ?? "easy",
      timeLimitSeconds:  problem.timeLimitSeconds  ?? "",
      memoryLimitMB:     problem.memoryLimitMB     ?? "",
    });
    setSaveError(null);
    setSaveSuccess(false);
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm({});
    setSaveError(null);
    setSaveSuccess(false);
  };

  // ── Save changes ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = {
        ...editForm,
        checker: { mode: editForm.checkerMode || "token" },
        timeLimitSeconds: editForm.timeLimitSeconds ? Number(editForm.timeLimitSeconds) : undefined,
        memoryLimitMB:    editForm.memoryLimitMB    ? Number(editForm.memoryLimitMB)    : undefined,
      };
      const res  = await api.put(`/problems/${editingId}`, payload);
      const data = res.data;
      if (!data.success) throw new Error(data.message || "Failed to update problem.");
      setSaveSuccess(true);
      setProblems((prev) => prev.map((p) => (p._id === editingId ? { ...p, ...payload } : p)));
      setTimeout(closeEdit, 1000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Delete problem ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this problem?")) return;
    setDeletingId(id);
    try {
      const res  = await api.delete(`/problems/${id}`);
      const data = res.data;
      if (!data.success) throw new Error(data.message || "Failed to delete.");
      setProblems((prev) => prev.filter((p) => p._id !== id));
      if (editingId === id) closeEdit();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Publish problem ─────────────────────────────────────────────────────────
  const handlePublish = async (id) => {
    try {
      const res  = await api.patch(`/problems/${id}/publish`);
      const data = res.data;
      if (!data.success) throw new Error(data.message || "Failed to publish.");
      setProblems((prev) => prev.map((p) => (p._id === id ? { ...p, status: "published" } : p)));
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Filter + search ──────────────────────────────────────────────────────────
  const filteredProblems = problems.filter(p => {
    const matchesSearch = !searchQuery || p.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterTab === "All Problems" ? true :
      filterTab === "Published"    ? p.status === "published" :
      filterTab === "Drafts"       ? p.status !== "published" :
      true;
    return matchesSearch && matchesFilter;
  });

  const inputStyle = {
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
    fontFamily: "Space Grotesk, sans-serif",
    color: "#1e293b",
    background: "#fff",
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    display: "block",
    marginBottom: "5px",
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
        <AdminNav2 />

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* Page Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", margin: 0 }}>Problem Management</h1>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px" }}>Create and manage contest problems</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <span
                  className="material-symbols-outlined"
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#94a3b8", pointerEvents: "none" }}
                >
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: "34px", width: "200px" }}
                />
              </div>
              {/* Add Problem */}
              <Link
                to="/addproblem"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", background: PRIMARY, color: "#fff",
                  borderRadius: "9px", textDecoration: "none",
                  fontSize: "13px", fontWeight: "700",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
                Add Problem
              </Link>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "2px solid #f1f5f9", paddingBottom: "0" }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  fontFamily: "Space Grotesk, sans-serif",
                  color: filterTab === tab ? PRIMARY : "#64748b",
                  borderBottom: filterTab === tab ? `2px solid ${PRIMARY}` : "2px solid transparent",
                  marginBottom: "-2px",
                  transition: "all 0.15s",
                }}
              >
                {tab}
                <span
                  style={{
                    marginLeft: "6px",
                    background: filterTab === tab ? `rgba(0,97,153,0.1)` : "#f1f5f9",
                    color: filterTab === tab ? PRIMARY : "#94a3b8",
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "1px 6px",
                    borderRadius: "10px",
                  }}
                >
                  {tab === "All Problems" ? problems.length
                 : tab === "Published"    ? problems.filter(p => p.status === "published").length
                 : problems.filter(p => p.status !== "published").length}
                </span>
              </button>
            ))}
          </div>

          {/* Problems Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              marginBottom: "20px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                <tr>
                  {["Title", "Difficulty", "Checker", "Time Limit", "Memory Limit", "Status", "Actions"].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      Loading problems…
                    </td>
                  </tr>
                )}
                {fetchError && (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#ef4444", fontSize: "13px" }}>
                      {fetchError}
                    </td>
                  </tr>
                )}
                {!loading && !fetchError && filteredProblems.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      No problems found.
                    </td>
                  </tr>
                )}
                {!loading && filteredProblems.map((problem) => (
                  <tr
                    key={problem._id}
                    style={{ borderBottom: "1px solid #f8fafc" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    {/* Title */}
                    <td style={{ padding: "14px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          background: `rgba(0,97,153,0.1)`,
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: "13px", fontWeight: "800", color: PRIMARY }}>
                          {problem.letter ?? "?"}
                        </span>
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>{problem.title}</span>
                    </td>

                    {/* Difficulty */}
                    <td style={{ padding: "14px 14px" }}>
                      <DifficultyBadge status={problem.difficulty} />
                    </td>

                    {/* Checker */}
                    <td style={{ padding: "14px 14px", fontSize: "12px", color: "#334155", fontWeight: "700" }}>
                      {(problem.checker?.mode || "token").toUpperCase()}
                    </td>

                    {/* Time Limit */}
                    <td style={{ padding: "14px 14px", fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                      {problem.timeLimitSeconds}s
                    </td>

                    {/* Memory Limit */}
                    <td style={{ padding: "14px 14px", fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                      {problem.memoryLimitMB}MB
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 14px" }}>
                      {problem.status === "published" ? (
                        <StatusBadge status="published" />
                      ) : (
                        <button
                          onClick={() => handlePublish(problem._id)}
                          style={{
                            background: "#f1f5f9",
                            color: "#64748b",
                            border: "none",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            cursor: "pointer",
                            fontFamily: "Space Grotesk, sans-serif",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#dbeafe"; e.currentTarget.style.color = "#1d4ed8"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
                        >
                          Draft — Publish
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 14px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => openEdit(problem)}
                          style={{
                            width: "32px", height: "32px", borderRadius: "8px",
                            border: "1px solid #e2e8f0", background: "#fff",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#64748b", transition: "all 0.15s",
                          }}
                          title="Edit"
                          onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.color = PRIMARY; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(problem._id)}
                          disabled={deletingId === problem._id}
                          style={{
                            width: "32px", height: "32px", borderRadius: "8px",
                            border: "1px solid #e2e8f0", background: "#fff",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#64748b", transition: "all 0.15s",
                            opacity: deletingId === problem._id ? 0.4 : 1,
                          }}
                          title="Delete"
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Panel */}
          {editingId && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                overflow: "hidden",
                marginBottom: "24px",
              }}
            >
              {/* Edit Panel Header */}
              <div
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #f1f5f9",
                  padding: "12px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px", color: PRIMARY }}>edit_square</span>
                  Edit Problem
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={closeEdit}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      border: "1px solid #e2e8f0", borderRadius: "8px",
                      height: "36px", padding: "0 14px",
                      background: "#fff", color: "#64748b", cursor: "pointer",
                      fontSize: "13px", fontWeight: "600", fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    <X size={14} /> Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      border: "none", borderRadius: "8px",
                      height: "36px", padding: "0 16px",
                      background: PRIMARY, color: "#fff", cursor: saveLoading ? "not-allowed" : "pointer",
                      fontSize: "13px", fontWeight: "700", fontFamily: "Space Grotesk, sans-serif",
                      opacity: saveLoading ? 0.7 : 1,
                    }}
                  >
                    {saveLoading ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {saveError && (
                <div style={{ margin: "12px 18px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "13px", borderRadius: "8px" }}>
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div style={{ margin: "12px 18px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: "13px", borderRadius: "8px" }}>
                  Problem updated successfully!
                </div>
              )}

              {/* Body */}
              <div style={{ display: "flex", color: "#374151" }}>
                {/* Left: Statement */}
                <div style={{ flex: "0 0 66%", padding: "20px", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>Problem Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Problem Statement</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Write the problem statement here..."
                      style={{
                        ...inputStyle, width: "100%", height: "140px",
                        resize: "vertical", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Input Description</label>
                      <input
                        type="text"
                        value={editForm.inputDescription}
                        onChange={e => setEditForm(p => ({ ...p, inputDescription: e.target.value }))}
                        placeholder="Input format..."
                        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Output Description</label>
                      <input
                        type="text"
                        value={editForm.outputDescription}
                        onChange={e => setEditForm(p => ({ ...p, outputDescription: e.target.value }))}
                        placeholder="Output format..."
                        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Metadata */}
                <div style={{ flex: "0 0 34%", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", margin: "0 0 4px" }}>Problem Metadata</p>

                  <div>
                    <label style={labelStyle}>Difficulty</label>
                    <select
                      value={editForm.difficulty}
                      onChange={e => setEditForm(p => ({ ...p, difficulty: e.target.value }))}
                      style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Checker Mode</label>
                    <select
                      value={editForm.checkerMode || "token"}
                      onChange={e => setEditForm(p => ({ ...p, checkerMode: e.target.value }))}
                      style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
                    >
                      <option value="token">Token (ignore extra spaces)</option>
                      <option value="line">Line by line</option>
                      <option value="exact">Exact match</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Time Limit (s)</label>
                      <input
                        type="number"
                        value={editForm.timeLimitSeconds}
                        onChange={e => setEditForm(p => ({ ...p, timeLimitSeconds: e.target.value }))}
                        placeholder="e.g. 2"
                        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Memory Limit (MB)</label>
                      <input
                        type="number"
                        value={editForm.memoryLimitMB}
                        onChange={e => setEditForm(p => ({ ...p, memoryLimitMB: e.target.value }))}
                        placeholder="e.g. 256"
                        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default AdminProblems;
