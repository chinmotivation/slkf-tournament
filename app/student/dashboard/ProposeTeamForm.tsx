'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  applicationId: string
  tournamentId: string
  myStudentNumber: string
  myFullName: string
  defaultTeamName?: string
  rejectedGroupId?: string | null
  rejectedTeamName?: string | null
}

export default function ProposeTeamForm({
  applicationId,
  tournamentId,
  myStudentNumber,
  myFullName,
  defaultTeamName = '',
  rejectedGroupId,
  rejectedTeamName,
}: Props) {
  const router = useRouter()
  const [teamName,   setTeamName]   = useState(defaultTeamName)
  const [teammate1,  setTeammate1]  = useState('')
  const [teammate2,  setTeammate2]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)

  async function cancelRejected() {
    if (!rejectedGroupId) return
    setCancelling(true)
    try {
      await fetch(`/api/student/team-kata?id=${rejectedGroupId}`, { method: 'DELETE' })
      router.refresh()
    } catch {
      setError('Failed to cancel. Try again.')
    } finally {
      setCancelling(false)
    }
  }

  async function propose() {
    if (!teamName.trim())   { setError('Enter a team name.'); return }
    if (!teammate1.trim())  { setError('Enter Teammate 2 student ID.'); return }
    if (!teammate2.trim())  { setError('Enter Teammate 3 student ID.'); return }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/student/team-kata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id:    tournamentId,
          team_name:        teamName.trim(),
          teammate1_number: teammate1.trim().toUpperCase(),
          teammate2_number: teammate2.trim().toUpperCase(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? json.message ?? 'Failed to submit team.')
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-amber-800">Team submitted! Waiting for HM approval.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
        <p className="text-sm font-semibold text-blue-900">
          {rejectedGroupId ? 'Re-submit Your Team' : 'Submit Your Team'}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          Your Head Master will approve the team after you submit.
        </p>
      </div>

      {/* Rejected notice */}
      {rejectedGroupId && rejectedTeamName && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-red-700">Previous team "{rejectedTeamName}" was rejected</p>
            <p className="text-xs text-red-500 mt-0.5">Cancel it below to submit a new team.</p>
          </div>
          <button
            onClick={cancelRejected}
            disabled={cancelling}
            className="text-xs text-red-600 border border-red-300 rounded-lg px-2.5 py-1.5 hover:bg-red-100 disabled:opacity-40 transition-colors shrink-0 font-medium"
          >
            {cancelling ? 'Cancelling…' : 'Cancel it'}
          </button>
        </div>
      )}

      <div className="p-4 space-y-4">

        {/* Team name */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={e => { setTeamName(e.target.value); setError(null) }}
            placeholder="e.g. Waththala Team A"
            maxLength={80}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Members */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">Members</label>

          {/* Member 1 — you */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">{myFullName}</p>
              <p className="text-xs text-blue-500">You (team leader)</p>
            </div>
            {myStudentNumber && (
              <span className="font-mono text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 shrink-0">
                {myStudentNumber}
              </span>
            )}
          </div>

          {/* Member 2 */}
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-gray-300 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <input
              type="text"
              value={teammate1}
              onChange={e => { setTeammate1(e.target.value.toUpperCase()); setError(null) }}
              placeholder="ISK-WAT-0002"
              maxLength={20}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Member 3 */}
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-gray-300 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
            <input
              type="text"
              value={teammate2}
              onChange={e => { setTeammate2(e.target.value.toUpperCase()); setError(null) }}
              placeholder="ISK-WAT-0003"
              maxLength={20}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Teammates must be approved and registered for Team Kata. Ask them to share their Student ID from their dashboard.
        </p>

        {error && (
          <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={propose}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
        >
          {saving ? 'Submitting…' : 'Submit Team → HM Approval'}
        </button>
      </div>
    </div>
  )
}
