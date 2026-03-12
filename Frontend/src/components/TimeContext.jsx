import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api'
import { connectSocket } from '../socket'

const contextTime = createContext(null)

export function TimeProvider({ children }) {
  const [contest, setContest]     = useState(null)
  const [timeleft, setTimeleft]   = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [hasEnded, setHasEnded]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const resetState = useCallback(() => {
    setContest(null)
    setTimeleft(0)
    setIsRunning(false)
    setHasEnded(false)
  }, [])

  // ── Fetch active contest + sync timer from server ─────────────────────────
  const syncFromServer = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      resetState()
      setLoading(false)
      return
    }

    try {
      const res  = await api.get('/contests/active')
      const data = res.data

      if (!data.success) throw new Error(data.message || 'Failed to load contest.')

      if (!data.data) {
        resetState()
        setLoading(false)
        return
      }

      const c = data.data
      setContest(c)
      setIsRunning(c.status === 'running')
      setHasEnded(false)

      // Fetch timer
      const timerRes  = await api.get(`/contests/${c._id}/timer`)
      const timerData = timerRes.data

      if (timerData.success) {
        const remainingMs = Number(timerData.data.remainingMs)
        const remaining = Number.isFinite(remainingMs)
          ? Math.max(0, Math.floor(remainingMs / 1000))
          : 0
        setTimeleft(remaining)
        // Only mark as ended if the DB status itself says ended — not based on elapsed time
        if (c.status === 'ended') setHasEnded(true)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [resetState])

  // Initial load
  useEffect(() => { syncFromServer() }, [syncFromServer])

  // Periodic refresh as fallback in case socket reconnects late.
  useEffect(() => {
    const interval = setInterval(() => {
      syncFromServer()
    }, 15000)

    return () => clearInterval(interval)
  }, [syncFromServer])

  // ── Local countdown tick ─────────────────
  useEffect(() => {
    if (!contest || contest.status !== 'running') return

    const interval = setInterval(() => {
      setTimeleft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [contest])

  // Real-time contest lifecycle sync between admin and students.
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const socket = connectSocket(token)
    const handleContestChange = () => {
      syncFromServer()
    }

    socket.on('connect', handleContestChange)
    socket.on('contest:started', handleContestChange)
    socket.on('contest:paused', handleContestChange)
    socket.on('contest:resumed', handleContestChange)
    socket.on('contest:ended', handleContestChange)
    socket.on('contest:updated', handleContestChange)
    socket.on('time:sync', handleContestChange)

    return () => {
      socket.off('connect', handleContestChange)
      socket.off('contest:started', handleContestChange)
      socket.off('contest:paused', handleContestChange)
      socket.off('contest:resumed', handleContestChange)
      socket.off('contest:ended', handleContestChange)
      socket.off('contest:updated', handleContestChange)
      socket.off('time:sync', handleContestChange)
      socket.disconnect()
    }
  }, [syncFromServer])

  // ── API actions ───────────────────────────────────────────────────────────

  const startContest = async () => {
    if (!contest) return
    try {
      const res  = await api.post(`/contests/${contest._id}/start`)
      const data = res.data
      if (!data.success) throw new Error(data.message)
      setIsRunning(true)
      setHasEnded(false)
      setContest(prev => ({ ...prev, status: 'running', startedAt: data.data.startedAt }))
      await syncFromServer()
    } catch (err) { setError(err.response?.data?.message || err.message) }
  }

  const pauseContest = async () => {
    if (!contest) return
    try {
      const res  = await api.post(`/contests/${contest._id}/pause`)
      const data = res.data
      if (!data.success) throw new Error(data.message)
      setIsRunning(false)
      setContest(prev => ({ ...prev, status: 'paused' }))
    } catch (err) { setError(err.response?.data?.message || err.message) }
  }

  const resumeContest = async () => {
    if (!contest) return
    try {
      const res  = await api.post(`/contests/${contest._id}/resume`)
      const data = res.data
      if (!data.success) throw new Error(data.message)
      setIsRunning(true)
      setContest(prev => ({ ...prev, status: 'running' }))
      await syncFromServer()
    } catch (err) { setError(err.response?.data?.message || err.message) }
  }

  const endContest = async () => {
    if (!contest) return
    try {
      const res  = await api.post(`/contests/${contest._id}/end`)
      const data = res.data
      if (!data.success) throw new Error(data.message)
      setIsRunning(false)
      setHasEnded(true)
      setTimeleft(0)
      setContest(prev => ({ ...prev, status: 'ended' }))
    } catch (err) { setError(err.response?.data?.message || err.message) }
  }

  const createContest = async (fields) => {
    try {
      const res  = await api.post('/contests', fields)
      const data = res.data
      if (!data.success) throw new Error(data.message)
      setContest(data.data)
      setTimeleft(data.data.durationMinutes * 60)
      setIsRunning(false)
      setHasEnded(false)
      return data.data
    } catch (err) {
      setError(err.response?.data?.message || err.message)
      throw err
    }
  }

  // Add extra minutes
  const addTimeToContest = async (extraMinutes) => {
    if (!contest) return
    const newDuration = contest.durationMinutes + extraMinutes
    try {
      const res  = await api.put(`/contests/${contest._id}`, { durationMinutes: newDuration })
      const data = res.data
      if (!data.success) throw new Error(data.message)
      setContest(prev => ({ ...prev, durationMinutes: newDuration }))
      setTimeleft(prev => prev + extraMinutes * 60)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
      throw err
    }
  }

  const clearError = () => setError(null)

  // time formating
  const formateTime = (secs) => {
    const h   = Math.floor(secs / 3600)
    const m   = Math.floor((secs % 3600) / 60)
    const s   = secs % 60
    const pad = n => String(n).padStart(2, '0')
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }

  return (
    // share all
    <contextTime.Provider value={{
      contest, timeleft, isRunning, hasEnded, loading, error,
      startContest, pauseContest, resumeContest, endContest,
      createContest, addTimeToContest, syncFromServer,
      clearError, formateTime,
    }}>
      {children}
    </contextTime.Provider>
  )
}

export function useTime() {
  const ctx = useContext(contextTime)
  if (!ctx) throw new Error('useTime must be used inside <TimeProvider>')
  return ctx
}
