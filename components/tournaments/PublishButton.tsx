'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  tournamentId: string
  tournamentName: string
}

export default function PublishButton({ tournamentId, tournamentName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handlePublish() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/publish`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to publish tournament.')
        return
      }
      router.refresh()
      setShowConfirm(false)
    } catch {
      setError('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Publish &ldquo;{tournamentName}&rdquo;?</span>
        <button
          onClick={handlePublish}
          disabled={loading}
          className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1 rounded-md transition-colors"
        >
          {loading ? 'Publishing…' : 'Confirm'}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setError(null) }}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-sm font-medium text-green-700 hover:text-green-900 border border-green-200 hover:border-green-400 px-3 py-1 rounded-md transition-colors"
    >
      Publish
    </button>
  )
}
