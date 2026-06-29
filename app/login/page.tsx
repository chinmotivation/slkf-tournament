import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign In — SLKF Tournament',
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = (data as { role: string } | null)?.role
    redirect(
      role === 'head_master' ? '/head-master/dashboard'
      : role === 'student'   ? '/student/dashboard'
      : role === 'super_admin' ? '/admin/dashboard'
      : role === 'referee'   ? '/referee/dashboard'
      : '/association/dashboard'
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:grid lg:grid-cols-[460px_1fr]">

      {/* ── Brand panel (left on desktop, compact top on mobile) ──────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-900 via-red-700 to-rose-600 flex flex-col items-center justify-center px-8 py-12 lg:min-h-screen">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-white/[0.05] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-black/[0.08] pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-40 h-40 rounded-full bg-white/[0.04] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center text-white max-w-xs">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-white rounded-2xl shadow-2xl ring-4 ring-white/20 mb-6">
            <span className="text-red-700 text-[22px] font-black tracking-tighter leading-none">SLKF</span>
          </div>

          <h1 className="text-xl lg:text-2xl font-bold leading-tight tracking-tight">
            Sri Lanka Karatedo Federation
          </h1>
          <p className="mt-2 text-sm text-red-200 font-medium tracking-wide">
            Tournament Management System
          </p>

          {/* Feature list — desktop only */}
          <ul className="mt-10 hidden lg:flex flex-col gap-3.5 text-left w-full">
            {[
              'Official nationwide tournament draws',
              'QR code athlete check-in',
              'Real-time brackets & results',
              'Federation-level Excel reporting',
            ].map(feat => (
              <li key={feat} className="flex items-center gap-3 text-sm text-red-100">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Form panel (right on desktop, main content on mobile) ──────────────── */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 bg-white min-h-0">
        <div className="w-full max-w-sm mx-auto">

          <div className="mb-8">
            <h2 className="text-[1.625rem] font-bold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1.5">Sign in to your account to continue</p>
          </div>

          <LoginForm />

          <p className="text-center text-sm text-gray-500 mt-7">
            New athlete?{' '}
            <a href="/register" className="text-red-600 hover:text-red-700 font-semibold transition-colors">
              Create an account
            </a>
          </p>

          <p className="text-center text-xs text-gray-400 mt-5">
            © {new Date().getFullYear()} Sri Lanka Karatedo Federation. All rights reserved.
          </p>
        </div>
      </div>

    </div>
  )
}
