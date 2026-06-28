import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'System Flow — SLKF Admin' }

const NAV = [
  { href: '/admin/dashboard',     label: 'Overview' },
  { href: '/admin/tournaments',   label: 'Tournaments' },
  { href: '/admin/associations',  label: 'Associations' },
  { href: '/admin/registrations', label: 'Registrations' },
  { href: '/admin/students',      label: 'Students' },
  { href: '/admin/system',        label: 'System' },
]

const ROLES = [
  { label: 'Super Admin',      bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  { label: 'Head Master',      bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  { label: 'Association Rep',  bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  { label: 'Student',          bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
]

function RoleBadge({ role }: { role: 'admin' | 'hm' | 'assoc' | 'student' }) {
  const map = {
    admin:   { label: 'Super Admin',     bg: 'bg-indigo-100', text: 'text-indigo-700' },
    hm:      { label: 'Head Master',     bg: 'bg-red-100',    text: 'text-red-700'    },
    assoc:   { label: 'Association Rep', bg: 'bg-blue-100',   text: 'text-blue-700'   },
    student: { label: 'Student',         bg: 'bg-emerald-100',text: 'text-emerald-700'},
  }
  const r = map[role]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${r.bg} ${r.text}`}>
      {r.label}
    </span>
  )
}

function Arrow() {
  return (
    <div className="flex flex-col items-center my-1">
      <div className="w-px h-6 bg-gray-300" />
      <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
        <path d="M7 8L0.0717964 0.5H13.9282L7 8Z" fill="#d1d5db" />
      </svg>
    </div>
  )
}

function PhaseLabel({ num, label, color }: { num: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-3 mb-3`}>
      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${color}`}>
        {num}
      </span>
      <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}

export default async function SystemFlowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  const profile = profileResult.data as { full_name: string; role: string } | null
  if (profile?.role !== 'super_admin') redirect('/unauthorized')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">SLKF Admin</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">System Flow</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(n => (
                <Link key={n.href} href={n.href}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    n.href === '/admin/system'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="text-sm text-gray-600 hidden sm:inline">{profile?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              Super Admin
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-2">

        {/* Legend */}
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Role Legend</p>
          <div className="flex flex-wrap gap-3">
            {ROLES.map(r => (
              <div key={r.label} className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ${r.bg} ${r.text}`}>
                <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                {r.label}
              </div>
            ))}
          </div>
        </div>

        {/* ─── PHASE 1: Tournament Setup ─── */}
        <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
          <PhaseLabel num={1} label="Tournament Setup" color="bg-indigo-500" />
          <div className="flex items-center gap-2 mb-4">
            <RoleBadge role="admin" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'DRAFT',    bg: 'bg-gray-100 text-gray-600',    desc: 'Created, not visible' },
              { label: 'OPEN',     bg: 'bg-green-100 text-green-700',   desc: 'Registration live' },
              { label: 'CLOSED',   bg: 'bg-amber-100 text-amber-700',   desc: 'After competition' },
              { label: 'ARCHIVED', bg: 'bg-gray-100 text-gray-400',     desc: 'Finalized' },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${s.bg}`}>{s.label}</span>
                  <span className="text-[10px] text-gray-400 mt-1">{s.desc}</span>
                </div>
                {i < arr.length - 1 && (
                  <svg className="w-5 h-5 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Super Admin sets tournament name, dates, fee structure, age eligibility cutoff, and venue. Transitions status manually.
          </p>
        </div>

        <Arrow />

        {/* ─── PHASE 2: Registration (two paths) ─── */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 px-6 pt-6 pb-3 shadow-sm mb-2">
            <PhaseLabel num={2} label="Registration Phase" color="bg-blue-500" />
            <p className="text-xs text-gray-400 mb-4">
              Triggered when tournament moves to <span className="font-semibold text-green-600">OPEN</span>. Two independent registration paths run in parallel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Association path */}
            <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <RoleBadge role="assoc" />
                <span className="text-xs text-gray-400">Association Path</span>
              </div>
              <ol className="space-y-3">
                {[
                  { step: '1', text: 'Log in to Association portal' },
                  { step: '2', text: 'Create application for tournament' },
                  { step: '3', text: 'Add athletes from roster' },
                  { step: '4', text: 'Select events (Kata / Kumite / Both)' },
                  { step: '5', text: 'Submit application' },
                ].map(s => (
                  <li key={s.step} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {s.step}
                    </span>
                    <span className="text-sm text-gray-700">{s.text}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 pt-3 border-t border-blue-50">
                <p className="text-[10px] text-blue-600 font-medium">
                  → One application per tournament per association. Multiple athletes per application.
                </p>
              </div>
            </div>

            {/* Student path */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <RoleBadge role="student" />
                <span className="text-xs text-gray-400">Student Path</span>
              </div>
              <ol className="space-y-3">
                {[
                  { step: '1', text: 'Log in to Student portal' },
                  { step: '2', text: 'Select open tournament' },
                  { step: '3', text: 'Fill application (age, events, weight)' },
                  { step: '4', text: 'Upload bank payment proof' },
                  { step: '5', text: 'Submit application' },
                ].map(s => (
                  <li key={s.step} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {s.step}
                    </span>
                    <span className="text-sm text-gray-700">{s.text}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 pt-3 border-t border-emerald-50">
                <p className="text-[10px] text-emerald-600 font-medium">
                  → One application per tournament. Student number assigned on approval.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Converging arrow */}
        <div className="flex flex-col items-center my-1">
          <div className="flex justify-around w-full max-w-xs">
            <div className="flex flex-col items-center">
              <div className="w-px h-6 bg-blue-200" />
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M5 6L0 0H10L5 6Z" fill="#bfdbfe" />
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-px h-6 bg-emerald-200" />
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M5 6L0 0H10L5 6Z" fill="#a7f3d0" />
              </svg>
            </div>
          </div>
        </div>

        {/* ─── PHASE 3: Review & Approval ─── */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
          <PhaseLabel num={3} label="Review & Approval" color="bg-red-500" />
          <div className="flex items-center gap-2 mb-4">
            <RoleBadge role="hm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-3 bg-red-50 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">Head Master reviews all incoming applications</p>
                <p className="text-xs text-red-500 mt-1">Verifies athlete eligibility, age category, payment proof (students), and entry completeness.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-bold text-green-800">APPROVED</span>
              </div>
              <ul className="space-y-1.5 text-xs text-green-700">
                <li>• Unique QR check-in token generated</li>
                <li>• Association rep sees QR per athlete</li>
                <li>• Student sees QR on application page</li>
                <li>• Student number assigned (students only)</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-bold text-red-800">REJECTED</span>
              </div>
              <ul className="space-y-1.5 text-xs text-red-700">
                <li>• Rejection reason recorded</li>
                <li>• Applicant notified on dashboard</li>
                <li>• Can re-apply if tournament still OPEN</li>
              </ul>
            </div>
          </div>
        </div>

        <Arrow />

        {/* ─── PHASE 4: Competition Day Check-in ─── */}
        <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <PhaseLabel num={4} label="Competition Day Check-in" color="bg-amber-500" />
          <div className="flex items-center gap-2 mb-4">
            <RoleBadge role="hm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Athlete side */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Athlete</p>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-white rounded-xl border-2 border-gray-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.243m-4.243 0L9.757 9.757" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 text-center font-medium">Shows QR code on phone</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden sm:flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>

            {/* Official side */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Head Master</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded bg-amber-200 text-amber-800 font-bold flex items-center justify-center text-[10px]">📷</span>
                  Scan QR via camera
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded bg-amber-200 text-amber-800 font-bold flex items-center justify-center text-[10px]">🔍</span>
                  Manual name search
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-[10px]">✓</span>
                  Mark as Present
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px]">📋</span>
                  Attendance Board
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Total Entries', color: 'text-gray-900 bg-gray-50' },
              { label: 'Checked In',    color: 'text-emerald-700 bg-emerald-50' },
              { label: 'Pending',       color: 'text-amber-700 bg-amber-50' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg px-3 py-2 ${s.color} border border-opacity-20`}>
                <p className="text-xs font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Eligibility is checked automatically: athlete must have an APPROVED application and must not already be checked in.
          </p>
        </div>

        <Arrow />

        {/* ─── PHASE 5: Brackets & Competition ─── */}
        <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow-sm">
          <PhaseLabel num={5} label="Brackets & Scoring" color="bg-purple-500" />
          <div className="flex items-center gap-2 mb-4">
            <RoleBadge role="admin" />
            <span className="text-xs text-gray-300">+</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              Referee
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-900">Generate Draw Brackets</p>
                <p className="text-xs text-indigo-600 mt-0.5">Super Admin seeds athletes into single-elimination brackets per event, category, and gender.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-900">Referee Scoring</p>
                <p className="text-xs text-purple-600 mt-0.5">Referees access their assigned bracket, enter match results round by round. Winners advance automatically.</p>
              </div>
            </div>
          </div>
        </div>

        <Arrow />

        {/* ─── PHASE 6: Results ─── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <PhaseLabel num={6} label="Results & Medals" color="bg-gray-700" />
          <div className="flex items-center gap-2 mb-4">
            <RoleBadge role="admin" />
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { place: '🥇', label: '1st Place',    color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
              { place: '🥈', label: '2nd Place',    color: 'bg-gray-50 border-gray-200 text-gray-700' },
              { place: '🥉', label: '3rd Place',    color: 'bg-orange-50 border-orange-200 text-orange-800' },
            ].map(p => (
              <div key={p.label} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${p.color}`}>
                <span>{p.place}</span> {p.label}
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Result visibility</p>
            <div className="space-y-1.5">
              {[
                { who: 'Super Admin',      what: 'Full medal table, all brackets, export results' },
                { who: 'Head Master',      what: 'Read-only view of all brackets and results' },
                { who: 'Public (/results)', what: 'Published results page (read-only, no PII)' },
              ].map(r => (
                <div key={r.who} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="font-semibold text-gray-700 min-w-[110px]">{r.who}</span>
                  <span className="text-gray-400">→</span>
                  <span>{r.what}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Tournament set to <span className="font-semibold text-gray-700 mx-1">ARCHIVED</span> after results are finalized.
          </div>
        </div>

        {/* ─── Data flow overview ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Data & Security Model</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
            {[
              { icon: '🔒', label: 'Row-Level Security',    desc: 'Supabase RLS ensures each role can only access their own data.' },
              { icon: '🔑', label: 'Service Role (Admin)',  desc: 'Admin client bypasses RLS for head-master review & system operations.' },
              { icon: '🍪', label: 'HTTP-only Cookies',     desc: 'Sessions stored in secure HTTP-only cookies — no localStorage.' },
              { icon: '🎫', label: 'QR Token Isolation',    desc: 'QR codes encode opaque UUIDs only — no PII embedded in the QR.' },
              { icon: '✅', label: 'Server-side Validation', desc: 'All role checks and eligibility gates are enforced server-side.' },
              { icon: '🚫', label: 'Draft Protection',       desc: 'Draft tournaments are never exposed to association or public routes.' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="text-base mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-semibold text-gray-700">{item.label}</p>
                  <p className="text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 pb-6 mt-2">
          SLKF Tournament Management System · Built with Next.js App Router + Supabase
        </p>
      </main>
    </div>
  )
}
