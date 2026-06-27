'use client'

import { useState } from 'react'
import type { Athlete } from '@/types/database'

interface Props {
  applicationId: string
  athletes: Athlete[]
  selectedIds: string[]
  disabled?: boolean
}

export default function AthleteMultiSelect({ applicationId, athletes, selectedIds: initial, disabled }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSavedCount(null)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSavedCount(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/athletes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_ids: Array.from(selected) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to save athletes.')
        return
      }
      setSavedCount(json.data?.athlete_count ?? selected.size)
    } catch {
      setError('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (athletes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No active athletes registered in your association yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {athletes.map(athlete => (
          <label
            key={athlete.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
            } ${selected.has(athlete.id) ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}
          >
            <input
              type="checkbox"
              checked={selected.has(athlete.id)}
              onChange={() => { if (!disabled) toggle(athlete.id) }}
              disabled={disabled}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{athlete.full_name}</p>
              <p className="text-xs text-gray-500">
                {athlete.gender === 'MALE' ? 'Male' : 'Female'}
                {' · '}
                DOB: {new Date(athlete.date_of_birth).toLocaleDateString('en-LK', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
            {selected.has(athlete.id) && (
              <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </label>
        ))}
      </div>

      {!disabled && (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
          <button
            onClick={handleSave}
            disabled={loading}
            className="text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Saving…' : `Save Selection (${selected.size})`}
          </button>
          {savedCount !== null && (
            <span className="text-xs text-green-600 font-medium">
              ✓ Saved — {savedCount} athlete{savedCount !== 1 ? 's' : ''}
            </span>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}
    </div>
  )
}
