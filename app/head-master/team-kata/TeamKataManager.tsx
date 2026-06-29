'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NamedGroup } from './page'

interface Student {
  id: string
  full_name: string
  student_number: string | null
  age_category_code: string
  gender: string
  belt_grade: string
}

interface TeamGroup {
  id: string
  team_name: string
  status: string
  member1_app_id: string
  member2_app_id: string
  member3_app_id: string
}

interface Props {
  tournamentId: string
  tournamentName: string
  eligible: Student[]
  teams: TeamGroup[]
  allStudents: Student[]
  namedGroups: NamedGroup[]
}

export default function TeamKataManager({ tournamentId, tournamentName, eligible, teams, allStudents, namedGroups }: Props) {
  const router = useRouter()
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [teamName, setTeamName]   = useState('')
  const [saving,   setSaving]     = useState(false)
  const [acting,   setActing]     = useState<string | null>(null)
  const [error,    setError]      = useState<string | null>(null)

  const studentMap = new Map(allStudents.map(s => [s.id, s]))

  const pendingTeams   = teams.filter(g => g.status === 'PENDING')
  const confirmedTeams = teams.filter(g => g.status === 'CONFIRMED')
  const rejectedTeams  = teams.filter(g => g.status === 'REJECTED')

  const confirmedIds = new Set(confirmedTeams.flatMap(g => [g.member1_app_id, g.member2_app_id, g.member3_app_id]))
  const pendingIds   = new Set(pendingTeams.flatMap(g =>   [g.member1_app_id, g.member2_app_id, g.member3_app_id]))
  const placedIds    = new Set([...confirmedIds, ...pendingIds])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
    setError(null)
  }

  async function confirmNamedGroup(group: NamedGroup, status: 'CONFIRMED' | 'REJECTED') {
    const approvedMembers = group.members.filter(m => m.status === 'APPROVED')
    if (approvedMembers.length !== 3) { setError('All 3 members must be approved before confirming.'); return }
    const [m1, m2, m3] = approvedMembers
    setActing(group.team_name + status)
    setError(null)
    try {
      const res = await fetch('/api/head-master/team-kata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id:  tournamentId,
          team_name:      group.team_name,
          member1_app_id: m1.id,
          member2_app_id: m2.id,
          member3_app_id: m3.id,
          status,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? json.message ?? 'Failed.'); return }
      router.refresh()
    } catch { setError('Network error.') }
    finally { setActing(null) }
  }

  async function createTeam() {
    if (selected.size !== 3) { setError('Select exactly 3 students.'); return }
    if (!teamName.trim())    { setError('Enter a team name.'); return }
    setSaving(true)
    setError(null)
    try {
      const [m1, m2, m3] = [...selected]
      const res = await fetch('/api/head-master/team-kata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId, team_name: teamName.trim(), member1_app_id: m1, member2_app_id: m2, member3_app_id: m3 }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? json.message ?? 'Failed to create team.'); return }
      setSelected(new Set())
      setTeamName('')
      router.refresh()
    } catch { setError('Network error.') }
    finally { setSaving(false) }
  }

  async function reviewTeam(id: string, status: 'CONFIRMED' | 'REJECTED') {
    setActing(id + status)
    setError(null)
    try {
      const res = await fetch('/api/head-master/team-kata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? json.message ?? 'Failed to update team.'); return }
      router.refresh()
    } catch { setError('Network error.') }
    finally { setActing(null) }
  }

  async function deleteTeam(id: string) {
    setActing(id + 'del')
    try {
      const res = await fetch(`/api/head-master/team-kata?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { setError('Failed to delete team.'); return }
      router.refresh()
    } catch { setError('Network error.') }
    finally { setActing(null) }
  }

  const unplaced = eligible.filter(s => !placedIds.has(s.id))
  const canConfirm = selected.size === 3 && teamName.trim().length > 0

  return (
    <div className="space-y-6">

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* ── Student proposals from registration ── */}
      {namedGroups.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
            Student Proposals ({namedGroups.length})
          </h2>
          <div className="space-y-3">
            {namedGroups.map(group => {
              const allApproved = group.members.length === 3 && group.members.every(m => m.status === 'APPROVED')
              const isActing = acting?.startsWith(group.team_name)
              return (
                <div key={group.team_name} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                  <div className="px-4 py-3 bg-amber-50 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">{group.team_name}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {group.members.length === 3
                          ? allApproved
                            ? 'All 3 members approved — ready to confirm'
                            : 'Some members not yet approved'
                          : `${group.members.length}/3 members registered`}
                      </p>
                    </div>
                    {allApproved && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => confirmNamedGroup(group, 'REJECTED')}
                          disabled={!!isActing}
                          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40 font-medium border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                        >
                          {acting === group.team_name + 'REJECTED' ? 'Rejecting…' : 'Reject'}
                        </button>
                        <button
                          onClick={() => confirmNamedGroup(group, 'CONFIRMED')}
                          disabled={!!isActing}
                          className="text-xs text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 font-medium rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          {acting === group.team_name + 'CONFIRMED' ? 'Confirming…' : 'Confirm'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {group.members.map((m, i) => (
                      <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          m.status === 'APPROVED' ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                          <p className="text-xs text-gray-400">{m.belt_grade} · {m.gender === 'MALE' ? 'Male' : 'Female'}</p>
                          {/* Show intended teammates under the leader's row */}
                          {i === 0 && m.intended_member2 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Intended: {m.intended_member2}{m.intended_member3 ? ` · ${m.intended_member3}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.student_number && (
                            <span className="font-mono text-xs text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                              {m.student_number}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                            m.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Show intended members who haven't registered yet */}
                    {group.members.length < 3 && group.members[0]?.intended_member2 && (
                      <>
                        {group.members.length < 2 && (
                          <div className="px-4 py-2.5 flex items-center gap-3 opacity-50">
                            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                            <p className="text-sm text-gray-400 italic">{group.members[0].intended_member2} — not applied yet</p>
                          </div>
                        )}
                        {group.members[0].intended_member3 && (
                          <div className="px-4 py-2.5 flex items-center gap-3 opacity-50">
                            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                            <p className="text-sm text-gray-400 italic">{group.members[0].intended_member3} — not applied yet</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Pending proposals (student-proposed via dashboard, legacy) ── */}
      {pendingTeams.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
            Pending Approval ({pendingTeams.length})
          </h2>
          <div className="space-y-3">
            {pendingTeams.map(group => {
              const members = [group.member1_app_id, group.member2_app_id, group.member3_app_id]
                .map(id => studentMap.get(id))
              const isActing = acting?.startsWith(group.id)
              return (
                <div key={group.id} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                  <div className="px-4 py-3 bg-amber-50 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">{group.team_name}</p>
                      <p className="text-xs text-amber-600 mt-0.5">Awaiting your approval</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => reviewTeam(group.id, 'REJECTED')}
                        disabled={!!isActing}
                        className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40 font-medium border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                      >
                        {acting === group.id + 'REJECTED' ? 'Rejecting…' : 'Reject'}
                      </button>
                      <button
                        onClick={() => reviewTeam(group.id, 'CONFIRMED')}
                        disabled={!!isActing}
                        className="text-xs text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 font-medium rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        {acting === group.id + 'CONFIRMED' ? 'Approving…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {members.map((s, i) => s ? (
                      <div key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.belt_grade} · {s.gender === 'MALE' ? 'Male' : 'Female'}</p>
                        </div>
                        {s.student_number && (
                          <span className="font-mono text-xs text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 shrink-0">
                            {s.student_number}
                          </span>
                        )}
                      </div>
                    ) : null)}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Confirmed teams ── */}
      {confirmedTeams.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Confirmed Teams ({confirmedTeams.length})
          </h2>
          <div className="space-y-3">
            {confirmedTeams.map(group => {
              const members = [group.member1_app_id, group.member2_app_id, group.member3_app_id]
                .map(id => studentMap.get(id))
              return (
                <div key={group.id} className="bg-white rounded-xl border border-blue-200 overflow-hidden">
                  <div className="px-4 py-3 bg-blue-50 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900 text-sm">{group.team_name}</p>
                      <p className="text-xs text-blue-600 mt-0.5">Team Kata · {tournamentName}</p>
                    </div>
                    <button
                      onClick={() => deleteTeam(group.id)}
                      disabled={acting === group.id + 'del'}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40 font-medium border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-50 transition-colors"
                    >
                      {acting === group.id + 'del' ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {members.map((s, i) => s ? (
                      <div key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.belt_grade} · {s.gender === 'MALE' ? 'Male' : 'Female'}</p>
                        </div>
                        {s.student_number && (
                          <span className="font-mono text-xs text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 shrink-0">
                            {s.student_number}
                          </span>
                        )}
                      </div>
                    ) : null)}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Rejected ── */}
      {rejectedTeams.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Rejected ({rejectedTeams.length})
          </h2>
          <div className="space-y-2">
            {rejectedTeams.map(group => (
              <div key={group.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 line-through">{group.team_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Rejected · students can re-apply with a new name</p>
                </div>
                <button
                  onClick={() => deleteTeam(group.id)}
                  disabled={acting === group.id + 'del'}
                  className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                >
                  {acting === group.id + 'del' ? '…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── HM direct-create form ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Create Team Directly
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          You can also form teams directly without waiting for student proposals.
        </p>

        {unplaced.length === 0 && eligible.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No students have indicated Team Kata interest yet.
          </div>
        )}

        {unplaced.length === 0 && eligible.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 text-sm font-medium">
            All eligible students have been placed in teams.
          </div>
        )}

        {unplaced.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select exactly <strong>3 students</strong> to form a team.
              {selected.size > 0 && <span className="text-blue-600 font-medium"> {selected.size}/3 selected.</span>}
            </p>

            <div className="space-y-2">
              {unplaced.map(s => {
                const isSelected = selected.has(s.id)
                const maxReached = selected.size >= 3 && !isSelected
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => !maxReached && toggle(s.id)}
                    disabled={maxReached}
                    className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50'
                        : maxReached
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{s.full_name}</p>
                      <p className="text-xs text-gray-500">{s.belt_grade} · {s.gender === 'MALE' ? 'Male' : 'Female'}</p>
                    </div>
                    {s.student_number && (
                      <span className="font-mono text-xs text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 shrink-0">
                        {s.student_number}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {selected.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-blue-900">
                  {selected.size === 3 ? 'Name this team:' : `Select ${3 - selected.size} more student${3 - selected.size !== 1 ? 's' : ''} to continue`}
                </p>
                {selected.size === 3 && (
                  <>
                    <input
                      type="text"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="e.g. Waththala Team A"
                      maxLength={80}
                      className="w-full px-3 py-2.5 rounded-lg border border-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSelected(new Set()); setTeamName(''); setError(null) }}
                        className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-lg py-2 hover:bg-white transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={createTeam}
                        disabled={!canConfirm || saving}
                        className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg py-2 font-semibold transition-colors"
                      >
                        {saving ? 'Confirming…' : 'Confirm Team'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
