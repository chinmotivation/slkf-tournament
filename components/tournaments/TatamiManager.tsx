'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TournamentTatami } from '@/types/database'

interface Props {
  tournamentId: string
  initialTatamis: TournamentTatami[]
}

const DEFAULT_NAMES = ['Tatami A', 'Tatami B', 'Tatami C', 'Tatami D']

export default function TatamiManager({ tournamentId, initialTatamis }: Props) {
  const router = useRouter()
  const [tatamis, setTatamis] = useState<TournamentTatami[]>(initialTatamis)
  const [newName, setNewName]  = useState('')
  const [error, setError]      = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function addTatami(name: string) {
    if (!name.trim()) return
    setError(null)
    const res = await fetch(`/api/tournaments/${tournamentId}/tatamis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed to add tatami.')
      return
    }
    setTatamis(prev => [...prev, json.data as TournamentTatami])
    setNewName('')
    startTransition(() => router.refresh())
  }

  async function removeTatami(tatamiId: string) {
    setError(null)
    const res = await fetch(`/api/tournaments/${tournamentId}/tatamis/${tatamiId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error?.message ?? 'Failed to remove tatami.')
      return
    }
    setTatamis(prev => prev.filter(t => t.id !== tatamiId))
    startTransition(() => router.refresh())
  }

  const remaining = DEFAULT_NAMES.filter(n => !tatamis.some(t => t.name === n))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-8 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide pb-2 border-b border-gray-100">
          Tatami Configuration
        </h2>
        <p className="text-xs text-gray-400 mt-2">
          Configure the competition areas. At least one tatami is required before publishing.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current tatamis */}
      {tatamis.length > 0 ? (
        <div className="space-y-2">
          {tatamis.map(t => (
            <div
              key={t.id}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">{t.name}</span>
              </div>
              <button
                type="button"
                onClick={() => removeTatami(t.id)}
                disabled={isPending}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          No tatamis configured yet.
        </div>
      )}

      {/* Quick-add preset buttons */}
      {remaining.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {remaining.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => addTatami(name)}
                disabled={isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom name input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTatami(newName) } }}
          placeholder="Custom tatami name..."
          maxLength={50}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-300"
        />
        <button
          type="button"
          onClick={() => addTatami(newName)}
          disabled={isPending || !newName.trim()}
          className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
