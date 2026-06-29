import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { StudentProfile } from '@/types/database'
import Link from 'next/link'
import ProfileEditForm from './ProfileEditForm'

export const metadata = { title: 'Edit Profile — SLKF Tournament' }

export default async function StudentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any
  const result = await db.from('student_profiles').select('*').eq('id', user.id).single()
  const profile = result.data as StudentProfile | null
  if (!profile) redirect('/register')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Edit Profile</h1>
            <p className="text-xs text-gray-500">Update your athlete details</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <ProfileEditForm
            initialValues={{
              full_name: profile.full_name,
              date_of_birth: profile.date_of_birth,
              belt_grade: profile.belt_grade,
              phone: profile.phone,
            }}
          />
        </div>
      </main>
    </div>
  )
}
