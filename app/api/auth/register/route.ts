import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { created, serverError, validationError, conflict } from '@/lib/api-response'
import { registerSchema } from '@/lib/validations/student'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { email, password, full_name, date_of_birth, gender, belt_grade, phone } = parsed.data

    const supabase = await createClient()

    // Pass role + full_name in metadata so the handle_new_user trigger creates
    // the profiles row with role='student' correctly.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'student', full_name },
      },
    })

    if (signUpError) {
      const msg = signUpError.message.toLowerCase()
      if (
        msg.includes('already registered') ||
        msg.includes('already been registered') ||
        msg.includes('user already exists') ||
        msg.includes('email address') && msg.includes('invalid')
      ) {
        return conflict('An account with this email already exists. Please sign in or use a different email.', 'EMAIL_EXISTS')
      }
      return serverError(signUpError.message)
    }

    const user = signUpData.user
    if (!user) return serverError('Failed to create account.')

    // The handle_new_user trigger already created the profiles row via the trigger.
    // Insert extended student profile data using admin client (bypasses RLS —
    // the session cookie is not yet set within this same server request after signUp).
    const admin = createAdminClient() as any
    const { error: spError } = await admin.from('student_profiles').insert({
      id: user.id,
      full_name,
      date_of_birth,
      gender,
      belt_grade,
      phone,
    })

    if (spError && spError.code !== '23505') {
      console.error('[register] student_profiles insert error:', spError)
      return serverError('Failed to save student profile: ' + spError.message)
    }

    return created({ redirectTo: '/student/dashboard' }, 'Account created successfully.')
  } catch {
    return serverError()
  }
}
