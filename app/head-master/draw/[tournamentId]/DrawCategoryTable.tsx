'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DrawBracket } from '@/types/database'

interface Props {
  brackets: DrawBracket[]
  tournamentId: string
}

const STATUS_LABEL: Record<string, string> = {
  PREVIEW: 'Preview',
  LOCKED: 'Locked',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
}

const STATUS_COLOR: Record<string, string> = {
  PREVIEW: 'bg-blue-100 text-blue-700',
  LOCKED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-gray-100 text-gray-500',
}

const EVENT_COLOR: Record<string, string> = {
  KATA: 'bg-purple-100 text-purple-700',
  KUMITE: 'bg-red-100 text-red-700',
}

function categoryLabel(b: DrawBracket): string {
  const gender = b.gender === 'MALE' ? 'Male' : 'Female'
  const event = b.event
  const sub = b.event === 'KATA'
    ? (b.kata_level ? b.kata_level.replace('_', ' ') : 'All Levels')
    : (b.weight_class_label ?? 'Open Weight')
  return `${b.age_group_code} · ${gender} · ${event} · ${sub}`
}

export default function DrawCategoryTable({ brackets, tournamentId }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(bracketId: string) {
    setLoadingId(bracketId)
    setError(null)
    try {
      const res = await fetch('/api/draw/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bracket_id: bracketId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Generate failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleReset(bracketId: string) {
    if (!confirm('Reset this bracket? All recorded match results will be deleted and the draw will return to PREVIEW so you can regenerate it.')) return
    setLoadingId(bracketId)
    setError(null)
    try {
      const res = await fetch('/api/draw/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bracket_id: bracketId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Reset failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleLock(bracketId: string) {
    if (!confirm('Lock this bracket? Match numbers will be assigned and positions will be frozen.')) return
    setLoadingId(bracketId)
    setError(null)
    try {
      const res = await fetch('/api/draw/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bracket_id: bracketId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Lock failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  if (brackets.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
        <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 6h18M3 12h12M3 18h6M16 14l3 3 3-3M19 17V7" />
        </svg>
        <p className="text-sm font-medium text-gray-500">No brackets yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Brackets appear automatically when applications are approved.
        </p>
      </div>
    )
  }

  // Group by event for visual separation
  const kata   = brackets.filter(b => b.event === 'KATA')
  const kumite = brackets.filter(b => b.event === 'KUMITE')

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {[{ label: 'Kata', rows: kata }, { label: 'Kumite', rows: kumite }].map(({ label, rows }) =>
        rows.length === 0 ? null : (
          <section key={label}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{label}</h2>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Category</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Athletes</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Bracket</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Byes</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(b => {
                    const busy = loadingId === b.id
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Category */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${EVENT_COLOR[b.event] ?? ''}`}>
                              {b.event}
                            </span>
                            <span className="text-gray-800 font-medium">{categoryLabel(b)}</span>
                          </div>
                        </td>

                        {/* Athletes */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-gray-900 font-semibold">{b.participant_count}</span>
                        </td>

                        {/* Bracket size */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-gray-600">{b.bracket_size > 0 ? b.bracket_size : '—'}</span>
                        </td>

                        {/* Byes */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={b.bye_count > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                            {b.bracket_size > 0 ? b.bye_count : '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? ''}`}>
                            {STATUS_LABEL[b.status] ?? b.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* PREVIEW: show Generate / Regenerate */}
                            {b.status === 'PREVIEW' && (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => handleGenerate(b.id)}
                                  disabled={busy || b.participant_count < 2}
                                  title={b.participant_count < 2 ? `Only ${b.participant_count} participant — need at least 2 to generate a draw` : undefined}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  {busy ? 'Generating…' : b.generated_at ? 'Regenerate' : 'Generate Draw'}
                                </button>
                                {b.participant_count < 2 && (
                                  <span className="text-[10px] text-amber-600">
                                    {b.participant_count === 0 ? 'No participants' : '1 participant — need 2+'}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* PREVIEW + already generated: show Lock */}
                            {b.status === 'PREVIEW' && b.generated_at && (
                              <button
                                onClick={() => handleLock(b.id)}
                                disabled={busy}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                {busy ? 'Locking…' : 'Lock Draw'}
                              </button>
                            )}

                            {/* LOCKED / IN_PROGRESS / COMPLETE: Reset back to PREVIEW */}
                            {b.status !== 'PREVIEW' && (
                              <button
                                onClick={() => handleReset(b.id)}
                                disabled={busy}
                                title="Delete all match results and return to PREVIEW to regenerate"
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                {busy ? '…' : 'Reset Draw'}
                              </button>
                            )}

                            {/* Any generated bracket: View */}
                            {b.generated_at && (
                              <a
                                href={`/head-master/draw/${tournamentId}/${b.id}`}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
                              >
                                View Bracket
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      )}
    </div>
  )
}
