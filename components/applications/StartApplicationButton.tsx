'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StartApplicationButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApply() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/applications/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to create application.')
        return
      }
      router.push(`/association/applications/${json.data.id}`)
    } catch {
      setError('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleApply}
        disabled={loading}
        className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Starting…' : 'Start Application'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
