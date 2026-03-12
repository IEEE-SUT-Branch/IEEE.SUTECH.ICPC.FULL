import React, { useState } from "react";
import AdminNav from "./AdminNav";
import AdminNav2 from "./AdminNav2";
import { useTime } from "./TimeContext";
import {
  AlarmClock, Pause, Play, Square, RotateCcw,
  Plus, ChevronDown, ChevronUp, X,
} from "lucide-react";

// helper ─────────────────────────────────────────────────────────────
function StatusBadge({ isRunning, hasEnded, contest }) {
  if (!contest)
    return <span className="bg-gray-100 text-gray-400 text-xs font-bold px-4 py-2 rounded-full">No Contest</span>
  if (hasEnded)
    return <span className="bg-red-100 text-red-500 text-xs font-bold px-4 py-2 rounded-full">✕ Ended</span>
  if (isRunning)
    return <span className="bg-green-100 text-green-600 text-xs font-bold px-4 py-2 rounded-full">● Live</span>
  if (contest.status === 'paused')
    return <span className="bg-yellow-100 text-yellow-600 text-xs font-bold px-4 py-2 rounded-full">⏸ Paused</span>
  return <span className="bg-gray-100 text-gray-400 text-xs font-bold px-4 py-2 rounded-full">⏹ Not Started</span>
}

// Main Component ────────────────────────────────────────────────────────────
function AdminTime() {
  const {
    contest, timeleft, isRunning, hasEnded, loading, error,
    startContest, pauseContest, resumeContest, endContest,
    createContest, clearError, formateTime,
  } = useTime()

  // Create-contest form
  const [showCreate, setShowCreate]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createForm, setCreateForm]   = useState({
    title: '',
    durationMinutes: 60,
    type: 'placement',
    allowedLanguages: ['cpp', 'python', 'java'],
  })

  // Action loading states
  const [actionLoading, setActionLoading] = useState(null)

  const handleAction = async (label, fn) => {
    setActionLoading(label)
    try { await fn() } finally { setActionLoading(null) }
  }

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target
    setCreateForm(prev => ({ ...prev, [name]: value }))
  }

  const toggleLang = (lang) => {
    setCreateForm(prev => ({
      ...prev,
      allowedLanguages: prev.allowedLanguages.includes(lang)
        ? prev.allowedLanguages.filter(l => l !== lang)
        : [...prev.allowedLanguages, lang],
    }))
  }

  const handleCreate = async () => {
    setCreateError(null)
    if (!createForm.title.trim()) { setCreateError('Title is required.'); return }
    if (createForm.allowedLanguages.length === 0) { setCreateError('Select at least one language.'); return }
    setCreating(true)
    try {
      await createContest({
        title: createForm.title,
        durationMinutes: Number(createForm.durationMinutes),
        type: createForm.type,
        allowedLanguages: createForm.allowedLanguages,
      })
      setShowCreate(false)
      setCreateForm({ title: '', durationMinutes: 60, type: 'placement', allowedLanguages: ['cpp', 'python', 'java'] })
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-gray-100 flex font-opensans min-h-screen">
      <AdminNav />
      <div className="w-full">
        <AdminNav2 status={isRunning} />

        <div className="p-6 flex flex-col gap-5">

          {/* ── Global API error ── */}
          {error && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              <span>{error}</span>
              <button onClick={clearError}><X size={14} /></button>
            </div>
          )}

          {/* ── Timer Card ── */}
          <div className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-sm border border-gray-100">
            <div className="bg-blue-50 p-4 rounded-xl">
              <AlarmClock color="#00629b" size={36} />
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Time Remaining</p>
              {loading ? (
                <p className="text-2xl text-gray-300 font-bold animate-pulse">Loading…</p>
              ) : (
                <p className="font-bold text-5xl text-gray-800 tracking-tight">{formateTime(timeleft)}</p>
              )}
              {contest && (
                <p className="text-xs text-gray-400 mt-1">
                  {contest.title} · {contest.durationMinutes} min · {contest.type}
                </p>
              )}
            </div>
            <div className="ml-auto">
              <StatusBadge isRunning={isRunning} hasEnded={hasEnded} contest={contest} />
            </div>
          </div>

          {/* ── Contest Controls ── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-4">Contest Controls</p>
            <div className="flex gap-3 flex-wrap">

              {/* Start — only when contest exists and is not_started */}
              {contest && contest.status === 'not_started' && (
                <button
                  onClick={() => handleAction('start', startContest)}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 bg-[#00629b] hover:bg-sky-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  <Play size={16} />
                  {actionLoading === 'start' ? 'Starting…' : 'Start'}
                </button>
              )}

              {/* Resume — when paused */}
              {contest && contest.status === 'paused' && (
                <button
                  onClick={() => handleAction('resume', resumeContest)}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 bg-[#00629b] hover:bg-sky-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  <Play size={16} />
                  {actionLoading === 'resume' ? 'Resuming…' : 'Resume'}
                </button>
              )}

              {/* Pause — when running */}
              {isRunning && (
                <button
                  onClick={() => handleAction('pause', pauseContest)}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl border border-gray-200 transition-colors disabled:opacity-60"
                >
                  <Pause size={16} />
                  {actionLoading === 'pause' ? 'Pausing…' : 'Pause'}
                </button>
              )}

              {/* End — when running or paused */}
              {contest && (contest.status === 'running' || contest.status === 'paused') && (
                <button
                  onClick={() => handleAction('end', endContest)}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-500 font-semibold px-5 py-2.5 rounded-xl border border-red-200 transition-colors disabled:opacity-60 ml-auto"
                >
                  <Square size={16} />
                  {actionLoading === 'end' ? 'Ending…' : 'End Contest'}
                </button>
              )}

              {/* No contest yet */}
              {!contest && !loading && (
                <p className="text-sm text-gray-400 py-2">No active contest. Create one below.</p>
              )}
            </div>
          </div>

          {/* ── Create Contest Card ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowCreate(p => !p)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Plus size={18} color="#00629b" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Create New Contest</p>
                  <p className="text-xs text-gray-400">Set up a placement or final contest</p>
                </div>
              </div>
              {showCreate ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {showCreate && (
              <div className="border-t border-gray-100 px-6 pb-6 pt-4 flex flex-col gap-4">

                {createError && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                    {createError}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contest Title</label>
                  <input
                    name="title"
                    value={createForm.title}
                    onChange={handleCreateFormChange}
                    type="text"
                    placeholder="e.g. Placement Test 2026"
                    className="border border-gray-200 rounded-xl h-10 px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Duration + Type */}
                <div className="flex gap-3">
                  <div className="flex flex-col w-1/2">
                    <label className="text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      name="durationMinutes"
                      value={createForm.durationMinutes}
                      onChange={handleCreateFormChange}
                      type="number"
                      min={1}
                      className="border border-gray-200 rounded-xl h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="flex flex-col w-1/2">
                    <label className="text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      name="type"
                      value={createForm.type}
                      onChange={handleCreateFormChange}
                      className="border border-gray-200 rounded-xl h-10 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="placement">Placement (60 min)</option>
                      <option value="final">Final (4–5 hours)</option>
                    </select>
                  </div>
                </div>

                {/* Allowed Languages */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Allowed Languages</label>
                  <div className="flex gap-2">
                    {['cpp', 'python', 'java'].map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLang(lang)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                          createForm.allowedLanguages.includes(lang)
                            ? 'bg-[#00629b] text-white border-[#00629b]'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="bg-[#00629b] hover:bg-sky-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                  >
                    {creating ? 'Creating…' : 'Create Contest'}
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setCreateError(null) }}
                    className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Add Extra Time Card (only when contest active) ── */}
          {contest && !hasEnded && (
            <AddTimeCard />
          )}

        </div>
      </div>
    </div>
  )
}

// ── Add Time sub-component ────────────────────────────────────────────────────
function AddTimeCard() {
  const { addTimeToContest } = useTime()
  const [extraMins, setExtraMins] = useState(10)
  const [adding, setAdding]       = useState(false)
  const [addResult, setAddResult] = useState(null)
  const [addError, setAddError]   = useState(null)

  const handleAdd = async (mins) => {
    const amount = mins ?? extraMins
    setAddError(null)
    setAddResult(null)
    setAdding(true)
    try {
      await addTimeToContest(Number(amount))
      setAddResult(`+${amount} min added to the contest.`)
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-400 uppercase tracking-widest mb-4">Add Extra Time</p>

      {addResult && (
        <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 text-green-600 text-sm rounded-xl">
          {addResult}
        </div>
      )}
      {addError && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
          {addError}
        </div>
      )}

      {/* Quick add buttons */}
      <div className="flex gap-2 mb-4">
        {[5, 10, 15, 30].map(mins => (
          <button
            key={mins}
            type="button"
            onClick={() => handleAdd(mins)}
            disabled={adding}
            className="bg-blue-50 hover:bg-blue-100 text-[#00629b] font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            +{mins} min
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={extraMins}
          onChange={e => setExtraMins(Number(e.target.value))}
          min={1}
          className="h-10 border border-gray-200 rounded-xl px-4 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="mins"
        />
        <button
          type="button"
          onClick={() => handleAdd()}
          disabled={adding}
          className="h-10 bg-[#00629b] hover:bg-sky-800 text-white font-semibold px-5 rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          {adding ? 'Adding…' : 'Add Custom Time'}
        </button>
      </div>
    </div>
  )
}

export default AdminTime
