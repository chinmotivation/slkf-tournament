'use client'

import React, { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BracketMatch, DrawParticipant, DrawStatus } from '@/types/database'

type ParticipantInfo = Pick<DrawParticipant, 'id' | 'full_name' | 'association_name' | 'seed_position' | 'is_bye'>

interface Props {
  matches: BracketMatch[]
  participantMap: Record<string, ParticipantInfo>
  bracketSize: number
  bracketStatus: DrawStatus
  readOnly?: boolean
}

// Layout constants
const SLOT_H = 44
const MATCH_H = SLOT_H * 2  // 88px
const COL_W = 228
const CONN_W = 52

// ─── Participant name slot inside a match card ────────────────────────────────

function SlotContent({ p, isWinner }: { p: ParticipantInfo | null; isWinner: boolean }) {
  if (!p) return <span className="text-[11px] text-gray-300">TBD</span>
  if (p.is_bye) return <span className="text-[11px] text-gray-300 italic">BYE</span>
  return (
    <div className="min-w-0 flex-1">
      <div className={`text-[11px] font-medium truncate ${isWinner ? 'text-green-800' : 'text-gray-800'}`}>
        {isWinner && <span className="text-green-500 mr-1">✓</span>}
        {p.full_name ?? '—'}
      </div>
      {p.association_name && (
        <div className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">{p.association_name}</div>
      )}
    </div>
  )
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  p1,
  p2,
  canRecord,
  isPicking,
  recording,
  onStartPick,
  onCancelPick,
  onPickWinner,
}: {
  match: BracketMatch
  p1: ParticipantInfo | null
  p2: ParticipantInfo | null
  canRecord: boolean
  isPicking: boolean
  recording: boolean
  onStartPick: () => void
  onCancelPick: () => void
  onPickWinner: (winnerId: string) => void
}) {
  const isP1Winner = !!match.winner_id && match.winner_id === match.participant1_id
  const isP2Winner = !!match.winner_id && match.winner_id === match.participant2_id
  const isByeWin = match.status === 'BYE_WIN'
  const isComplete = match.status === 'COMPLETE'

  // A match is recordable if both real participants are present, it's PENDING, and bracket allows it
  const bothFilled = !!(match.participant1_id && match.participant2_id)
  const p1Real = p1 && !p1.is_bye
  const p2Real = p2 && !p2.is_bye
  const isRecordable = canRecord && match.status === 'PENDING' && bothFilled && p1Real && p2Real

  // "Pick winner" overlay replaces the card content when isPicking
  if (isPicking) {
    return (
      <div
        style={{ height: MATCH_H, width: COL_W }}
        className="border border-blue-300 rounded-lg overflow-hidden bg-blue-50 shadow-md flex flex-col"
      >
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
          Who won?
        </div>
        <div className="flex flex-col gap-1 px-2 pb-2 flex-1">
          <button
            onClick={() => p1 && onPickWinner(p1.id)}
            disabled={recording}
            className="flex-1 text-left text-[11px] font-medium text-gray-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-2.5 py-1 transition-colors disabled:opacity-50 truncate"
            style={{ borderLeft: '3px solid #ef4444' }}
          >
            {recording ? '…' : (p1?.full_name ?? 'P1')}
          </button>
          <button
            onClick={() => p2 && onPickWinner(p2.id)}
            disabled={recording}
            className="flex-1 text-left text-[11px] font-medium text-gray-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2.5 py-1 transition-colors disabled:opacity-50 truncate"
            style={{ borderLeft: '3px solid #3b82f6' }}
          >
            {recording ? '…' : (p2?.full_name ?? 'P2')}
          </button>
          <button
            onClick={onCancelPick}
            disabled={recording}
            className="text-[10px] text-gray-400 hover:text-gray-600 text-center py-0.5 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ height: MATCH_H, width: COL_W }}
      className={`relative border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col group ${
        isByeWin ? 'border-gray-100 opacity-50'
        : isComplete ? 'border-gray-300'
        : isRecordable ? 'border-gray-200 hover:border-blue-300 cursor-pointer'
        : 'border-gray-200'
      }`}
      onClick={isRecordable ? onStartPick : undefined}
      title={isRecordable ? 'Click to record match result' : undefined}
    >
      {/* Match number badge */}
      {match.match_number && (
        <div className="absolute -top-2 left-2 bg-gray-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded z-10 leading-none">
          M{match.match_number}
        </div>
      )}

      {/* "Record" hint shown on hover for recordable matches */}
      {isRecordable && (
        <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/60 transition-colors pointer-events-none rounded-lg z-0" />
      )}
      {isRecordable && (
        <div className="absolute bottom-1 right-2 text-[9px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          click to record
        </div>
      )}

      {/* Red corner — P1 */}
      <div
        style={{ height: SLOT_H, borderLeft: '3px solid #ef4444' }}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 border-b border-gray-100 overflow-hidden ${
          isP1Winner ? 'bg-green-50' : isByeWin ? 'bg-gray-50' : 'bg-red-50/40'
        }`}
      >
        <SlotContent p={p1} isWinner={isP1Winner} />
        {p1?.seed_position !== null && p1?.seed_position !== undefined && !p1.is_bye && (
          <span className="text-[9px] text-gray-300 font-mono flex-shrink-0 ml-auto pl-1">
            #{p1.seed_position}
          </span>
        )}
      </div>

      {/* Blue corner — P2 */}
      <div
        style={{ height: SLOT_H, borderLeft: '3px solid #3b82f6' }}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 overflow-hidden ${
          isP2Winner ? 'bg-green-50' : isByeWin ? 'bg-gray-50' : 'bg-blue-50/40'
        }`}
      >
        <SlotContent p={p2} isWinner={isP2Winner} />
        {p2?.seed_position !== null && p2?.seed_position !== undefined && !p2.is_bye && (
          <span className="text-[9px] text-gray-300 font-mono flex-shrink-0 ml-auto pl-1">
            #{p2.seed_position}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── SVG connector lines ──────────────────────────────────────────────────────

function ConnectorSVG({
  leftRound,
  rightRound,
  totalH,
}: {
  leftRound: number
  rightRound: number
  totalH: number
}) {
  const leftCount = Math.pow(2, leftRound - 1)
  const rightCount = Math.pow(2, rightRound - 1)
  const leftSectionH = totalH / leftCount
  const rightSectionH = totalH / rightCount
  const midX = CONN_W / 2

  const paths: React.ReactElement[] = []

  for (let k = 1; k <= rightCount; k++) {
    const y1 = (2 * k - 2) * leftSectionH + leftSectionH / 2
    const y2 = (2 * k - 1) * leftSectionH + leftSectionH / 2
    const yT = (k - 1) * rightSectionH + rightSectionH / 2

    paths.push(
      <g key={k} stroke="#d1d5db" strokeWidth={1.5} fill="none" strokeLinecap="round">
        <line x1={0} y1={y1} x2={midX} y2={y1} />
        <line x1={0} y1={y2} x2={midX} y2={y2} />
        <line x1={midX} y1={y1} x2={midX} y2={y2} />
        <line x1={midX} y1={yT} x2={CONN_W} y2={yT} />
      </g>
    )
  }

  return (
    <svg width={CONN_W} height={totalH} className="flex-shrink-0" style={{ overflow: 'visible' }}>
      {paths}
    </svg>
  )
}

// ─── Main bracket tree ────────────────────────────────────────────────────────

export default function BracketTree({ matches, participantMap, bracketSize, bracketStatus, readOnly = false }: Props) {
  const router = useRouter()
  const [pickingMatchId, setPickingMatchId] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [resultError, setResultError] = useState<string | null>(null)

  const canRecord = !readOnly && (bracketStatus === 'LOCKED' || bracketStatus === 'IN_PROGRESS')

  async function handlePickWinner(matchId: string, winnerId: string) {
    setRecording(true)
    setResultError(null)
    try {
      const res = await fetch('/api/draw/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, winner_id: winnerId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setResultError(json.error ?? 'Failed to record result')
      } else {
        setPickingMatchId(null)
        router.refresh()
      }
    } catch {
      setResultError('Network error — please try again.')
    } finally {
      setRecording(false)
    }
  }

  // Group matches by round_number
  const roundMap = new Map<number, BracketMatch[]>()
  for (const m of matches) {
    if (!roundMap.has(m.round_number)) roundMap.set(m.round_number, [])
    roundMap.get(m.round_number)!.push(m)
  }

  // Highest round_number = first round of play → leftmost column
  const sortedRounds = [...roundMap.keys()].sort((a, b) => b - a)

  if (sortedRounds.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No rounds to display.</p>
  }

  const totalH = bracketSize * SLOT_H
  const totalW = sortedRounds.length * COL_W + (sortedRounds.length - 1) * CONN_W

  return (
    <div className="overflow-x-auto pb-2">

      {/* Error banner */}
      {resultError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {resultError}
          <button onClick={() => setResultError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* Competition mode hint */}
      {canRecord && (
        <div className="mb-4 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <span>●</span>
          <span>Live mode — click any ready match to record the result</span>
        </div>
      )}

      {/* Round labels */}
      <div className="flex items-end mb-3" style={{ minWidth: totalW }}>
        {sortedRounds.map((r, i) => (
          <Fragment key={r}>
            <div style={{ width: COL_W, flexShrink: 0 }} className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {roundMap.get(r)![0].round_label}
              </span>
            </div>
            {i < sortedRounds.length - 1 && <div style={{ width: CONN_W, flexShrink: 0 }} />}
          </Fragment>
        ))}
      </div>

      {/* Bracket */}
      <div className="flex items-start" style={{ height: totalH, minWidth: totalW }}>
        {sortedRounds.map((r, i) => {
          const roundMatches = [...(roundMap.get(r) ?? [])].sort((a, b) => a.position - b.position)
          const sectionH = totalH / roundMatches.length

          return (
            <Fragment key={r}>
              <div style={{ width: COL_W, height: totalH, position: 'relative', flexShrink: 0 }}>
                {roundMatches.map(m => {
                  const top = (m.position - 1) * sectionH + (sectionH - MATCH_H) / 2
                  const p1 = m.participant1_id ? (participantMap[m.participant1_id] ?? null) : null
                  const p2 = m.participant2_id ? (participantMap[m.participant2_id] ?? null) : null
                  return (
                    <div key={m.id} style={{ position: 'absolute', top, left: 0, right: 0 }}>
                      <MatchCard
                        match={m}
                        p1={p1}
                        p2={p2}
                        canRecord={canRecord}
                        isPicking={pickingMatchId === m.id}
                        recording={recording}
                        onStartPick={() => { setPickingMatchId(m.id); setResultError(null) }}
                        onCancelPick={() => setPickingMatchId(null)}
                        onPickWinner={(winnerId) => handlePickWinner(m.id, winnerId)}
                      />
                    </div>
                  )
                })}
              </div>

              {i < sortedRounds.length - 1 && (
                <ConnectorSVG
                  leftRound={r}
                  rightRound={sortedRounds[i + 1]}
                  totalH={totalH}
                />
              )}
            </Fragment>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-4 rounded-sm bg-red-100 border-l-2 border-red-400" />
          Red corner (P1)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-4 rounded-sm bg-blue-100 border-l-2 border-blue-400" />
          Blue corner (P2)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-green-500 font-medium">✓</span>
          Winner advanced
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-4 rounded-sm bg-gray-100 opacity-50" />
          BYE (auto-advance)
        </div>
        {canRecord && (
          <div className="flex items-center gap-1.5 text-blue-500">
            <span>●</span>
            Click a match with both athletes to record result
          </div>
        )}
        {bracketStatus === 'PREVIEW' && (
          <div className="text-amber-500 font-medium">
            ⚠ Not locked — lock the bracket before recording results
          </div>
        )}
      </div>
    </div>
  )
}
