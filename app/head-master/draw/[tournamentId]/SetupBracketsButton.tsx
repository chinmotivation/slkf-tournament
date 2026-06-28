'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  tournamentId: string
  hasApprovedStudents: boolean
}

export default function SetupBracketsButton({ tournamentId, hasApprovedStudents }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ brackets_created: number; brackets_updated: number; total_participants: number } | null>(null)

  async function handleSetup() {
    if (!confirm('This will read all approved participants and create/refresh draw brackets. Continue?')) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/draw/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Setup failed')
      } else {
        setResult({ brackets_created: json.brackets_created, brackets_updated: json.brackets_updated, total_participants: json.total_participants })
        router.refresh()
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      {result && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {result.brackets_created > 0 && `${result.brackets_created} bracket${result.brackets_created !== 1 ? 's' : ''} created · `}
          {result.brackets_updated > 0 && `${result.brackets_updated} refreshed · `}
          {result.total_participants} participant{result.total_participants !== 1 ? 's' : ''} loaded
        </p>
      )}
      <button
        onClick={handleSetup}
        disabled={loading || !hasApprovedStudents}
        title={!hasApprovedStudents ? 'No approved participants yet' : undefined}
        className="flex items-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {loading ? 'Setting up…' : 'Setup / Refresh Brackets'}
      </button>
    </div>
  )
}
