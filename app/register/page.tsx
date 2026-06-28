import type { Metadata } from 'next'
import RegisterForm from './RegisterForm'

export const metadata: Metadata = { title: 'Register — SLKF Tournament' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="bg-red-600 text-white px-4 pt-10 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-3">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold">Create Athlete Account</h1>
        <p className="mt-1 text-sm text-red-200">Sri Lanka Karatedo Federation · Open Karate 2026</p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <RegisterForm />
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Sri Lanka Karatedo Federation
        </p>
      </div>
    </div>
  )
}
