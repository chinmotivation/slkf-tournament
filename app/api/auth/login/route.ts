import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validationError, ok, serverError } from '@/lib/api-response'
import { loginSchema } from '@/lib/validations/auth'
import type { UserRole } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const supabase = await createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (signInError) {
      return NextResponse.json(
        { error: { code: 'INVALID_LOGIN', message: 'Invalid email or password. Please try again.' } },
        { status: 401 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'SESSION_ERROR', message: 'Failed to establish session. Please try again.' } },
        { status: 500 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, is_active')
      .eq('id', user.id)
      .single()

    const p = profile as { role: UserRole; full_name: string; is_active: boolean } | null

    if (!p || !p.is_active) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Account not found or has been deactivated. Contact SLKF.' } },
        { status: 403 }
      )
    }

    const redirectTo =
      p.role === 'head_master' ? '/head-master/dashboard' : '/association/dashboard'

    return ok({ role: p.role, full_name: p.full_name, redirectTo })
  } catch {
    return serverError()
  }
}
