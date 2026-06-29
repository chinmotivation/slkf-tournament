import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export const metadata: Metadata = { title: 'Dashboard — SLKF Association' }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default async function AssociationDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const profile = data as { full_name: string } | null
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="page-header sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 bg-blue-600 rounded-xl shrink-0">
              <span className="text-white text-[11px] font-black tracking-tighter">SLKF</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.1em] leading-none mb-0.5">
                Tournament System
              </p>
              <h1 className="text-sm font-bold text-gray-900 leading-none">Association Portal</h1>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Tournaments', href: '/association/tournaments' },
              { label: 'Applications', href: '/association/applications' },
              { label: 'Athletes', href: '/association/athletes' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {profile?.full_name && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-blue-700">{initials(profile.full_name)}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden lg:block">{profile.full_name}</span>
              </div>
            )}
            <span className="badge bg-blue-100 text-blue-700 hidden sm:inline-flex">Association Rep</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Welcome ───────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Hello, {firstName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your association&apos;s tournament participation.</p>
        </div>

        {/* ── Quick actions ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <Link href="/association/tournaments" className="action-card group">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-blue-50 rounded-xl mb-4 group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Tournaments</h3>
            <p className="text-sm text-gray-500">Browse open tournaments and submit an application.</p>
          </Link>

          <Link href="/association/applications" className="action-card group">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-indigo-50 rounded-xl mb-4 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">My Applications</h3>
            <p className="text-sm text-gray-500">Create and track your tournament applications.</p>
          </Link>

          <Link href="/association/athletes" className="action-card group">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-teal-50 rounded-xl mb-4 group-hover:bg-teal-100 transition-colors">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Athletes</h3>
            <p className="text-sm text-gray-500">Manage your association&apos;s registered athlete roster.</p>
          </Link>

        </div>

        {/* ── Quick tip ─────────────────────────────────────────────────────── */}
        <div className="card p-5 flex items-start gap-4 bg-blue-50 border-blue-100">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4.5 h-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Getting started</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Register your athletes first, then open a tournament application and select who&apos;s competing.
              Your application is reviewed by the Head Master before approval.
            </p>
          </div>
        </div>

      </main>
    </div>
  )
}
