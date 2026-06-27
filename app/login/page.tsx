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
    redirect(role === 'head_master' ? '/head-master/dashboard' : '/association/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
            <span className="text-white text-xl font-bold tracking-tight">SLKF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sri Lanka Karate Federation</h1>
          <p className="text-gray-500 mt-1 text-sm">Tournament Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Sri Lanka Karatedo Federation. All rights reserved.
        </p>
      </div>
    </div>
  )
}
