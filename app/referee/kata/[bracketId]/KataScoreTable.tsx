'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BracketMatch, DrawParticipant } from '@/types/database'

type ParticipantInfo = Pick<DrawParticipant, 'id' | 'full_name' | 'association_name' | 'is_bye'>

interface Props {
  matches: BracketMatch[]
  participantMap: Record<string, ParticipantInfo>
  bracketStatus: string
}

// Groups matches by round for display: highest round_number first (first round of play)
function groupByRound(matches: BracketMatch[]) {
  const map = new Map<number, { label: string; matches: BracketMatch[] }>()
  for (const m of matches) {
    if (!map.has(m.round_number)) map.set(m.round_number, { label: m.round_label, matches: [] })
    map.get(m.round_number)!.matches.push(m)
  }
  // Sort descending: highest round_number = earliest round
  return [...map.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, v]) => v)
}

export default function KataScoreTable({ matches, participantMap, bracketStatus }: Props) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, { p1: string; p2: string }>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successId, setSuccessId] = useState<string | null>(null)

  const canScore = bracketStatus === 'LOCKED' || bracketStatus === 'IN_PROGRESS'
  const rounds = groupByRound(matches)

  function getScore(matchId: string): { p1: string; p2: string } {
    return scores[matchId] ?? { p1: '', p2: '' }
  }

  function setScore(matchId: string, field: 'p1' | 'p2', value: string) {
    setScores(prev => ({ ...prev, [matchId]: { ...getScore(matchId), [field]: value } }))
    setErrors(prev => { const e = { ...prev }; delete e[matchId]; return e })
  }

  async function handleSubmit(matchId: string) {
    const { p1, p2 } = getScore(matchId)
    const s1 = parseFloat(p1)
    const s2 = parseFloat(p2)

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      setErrors(prev => ({ ...prev, [matchId]: 'Enter valid scores for both athletes (≥ 0).' }))
      return
    }
    if (s1 === s2) {
      setErrors(prev => ({ ...prev, [matchId]: 'Scores are tied — adjust before submitting.' }))
      return
    }

    setSubmitting(matchId)
    try {
      const res = await fetch('/api/draw/kata-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, score_p1: s1, score_p2: s2 }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrors(prev => ({ ...prev, [matchId]: json.error ?? 'Failed to record scores.' }))
      } else {
        setSuccessId(matchId)
        setTimeout(() => setSuccessId(null), 2000)
        setScores(prev => { const s = { ...prev }; delete s[matchId]; return s })
        router.refresh()
      }
    } catch {
      setErrors(prev => ({ ...prev, [matchId]: 'Network error — please try again.' }))
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="space-y-8">
      {!canScore && bracketStatus !== 'COMPLETE' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          This bracket is not yet locked. Score entry is available once the head master locks the bracket.
        </div>
      )}

      {rounds.map(round => {
        const liveMatches = round.matches.filter(m => m.status !== 'BYE_WIN')
        const pending  = liveMatches.filter(m => m.status === 'PENDING').length
        const complete = liveMatches.filter(m => m.status === 'COMPLETE').length

        return (
          <section key={round.label}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{round.label}</h2>
              <span className="text-xs text-gray-400">
                {complete}/{liveMatches.length} scored
              </span>
              {pending > 0 && canScore && (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {pending} pending
                </span>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 w-8">#</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Red Corner (P1)</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-3 py-2.5 w-24">P1 Score</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-3 py-2.5 w-24">P2 Score</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Blue Corner (P2)</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-2.5 w-32">Result</th>
                    {canScore && <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5 w-28" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {round.matches
                    .sort((a, b) => a.position - b.position)
                    .map(m => {
                      const p1 = m.participant1_id ? participantMap[m.participant1_id] : null
                      const p2 = m.participant2_id ? participantMap[m.participant2_id] : null
                      const isBye = m.status === 'BYE_WIN'
                      const isComplete = m.status === 'COMPLETE'
                      const isRecordable = canScore && m.status === 'PENDING'
                        && !!m.participant1_id && !!m.participant2_id
                        && p1 && !p1.is_bye && p2 && !p2.is_bye
                      const busy = submitting === m.id
                      const err = errors[m.id]
                      const ok = successId === m.id
                      const { p1: s1val, p2: s2val } = getScore(m.id)

                      const winnerName = isComplete && m.winner_id
                        ? (participantMap[m.winner_id]?.full_name ?? '—')
                        : null

                      return (
                        <>
                          <tr
                            key={m.id}
                            className={`transition-colors ${
                              isBye ? 'opacity-40 bg-gray-50/40'
                              : isComplete ? 'bg-gray-50/30'
                              : isRecordable ? 'hover:bg-emerald-50/30'
                              : ''
                            }`}
                          >
                            {/* Match # */}
                            <td className="px-4 py-3 text-xs font-mono text-gray-400">
                              {m.match_number ? `M${m.match_number}` : '—'}
                            </td>

                            {/* P1 */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-0.5 h-5 bg-red-400 rounded-full flex-shrink-0" />
                                {p1 ? (
                                  <div>
                                    <span className={`font-medium ${
                                      isComplete && m.winner_id === m.participant1_id
                                        ? 'text-green-700' : 'text-gray-800'
                                    }`}>
                                      {isComplete && m.winner_id === m.participant1_id && (
                                        <span className="text-green-500 mr-1">✓</span>
                                      )}
                                      {p1.full_name ?? '—'}
                                    </span>
                                    {p1.association_name && (
                                      <p className="text-[10px] text-gray-400">{p1.association_name}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs">TBD</span>
                                )}
                              </div>
                            </td>

                            {/* P1 Score */}
                            <td className="px-3 py-3 text-center">
                              {isComplete ? (
                                <span className="text-sm font-semibold text-gray-700">
                                  {m.score_p1?.toFixed(2) ?? '—'}
                                </span>
                              ) : isRecordable ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={s1val}
                                  onChange={e => setScore(m.id, 'p1', e.target.value)}
                                  placeholder="0.00"
                                  className="w-20 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
                                />
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>

                            {/* P2 Score */}
                            <td className="px-3 py-3 text-center">
                              {isComplete ? (
                                <span className="text-sm font-semibold text-gray-700">
                                  {m.score_p2?.toFixed(2) ?? '—'}
                                </span>
                              ) : isRecordable ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={s2val}
                                  onChange={e => setScore(m.id, 'p2', e.target.value)}
                                  placeholder="0.00"
                                  className="w-20 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                                />
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>

                            {/* P2 */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-0.5 h-5 bg-blue-400 rounded-full flex-shrink-0" />
                                {p2 ? (
                                  <div>
                                    <span className={`font-medium ${
                                      isComplete && m.winner_id === m.participant2_id
                                        ? 'text-green-700' : 'text-gray-800'
                                    }`}>
                                      {isComplete && m.winner_id === m.participant2_id && (
                                        <span className="text-green-500 mr-1">✓</span>
                                      )}
                                      {p2.full_name ?? '—'}
                                    </span>
                                    {p2.association_name && (
                                      <p className="text-[10px] text-gray-400">{p2.association_name}</p>
                                    )}
                                  </div>
                                ) : isBye ? (
                                  <span className="text-gray-300 text-xs italic">BYE</span>
                                ) : (
                                  <span className="text-gray-300 text-xs">TBD</span>
                                )}
                              </div>
                            </td>

                            {/* Result */}
                            <td className="px-4 py-3 text-center">
                              {isBye ? (
                                <span className="text-xs text-gray-300 italic">Auto-advance</span>
                              ) : isComplete ? (
                                <span className="text-xs font-medium text-green-700">
                                  {winnerName} wins
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">Pending</span>
                              )}
                            </td>

                            {/* Submit */}
                            {canScore && (
                              <td className="px-4 py-3 text-right">
                                {isRecordable && (
                                  <button
                                    onClick={() => handleSubmit(m.id)}
                                    disabled={busy || !s1val || !s2val}
                                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {busy ? 'Saving…' : ok ? '✓ Saved' : 'Submit'}
                                  </button>
                                )}
                                {isComplete && (
                                  <span className="text-xs text-gray-300">Done</span>
                                )}
                              </td>
                            )}
                          </tr>
                          {err && (
                            <tr key={`${m.id}-err`} className="bg-red-50">
                              <td colSpan={canScore ? 7 : 6} className="px-4 py-1.5 text-xs text-red-600">
                                {err}
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
