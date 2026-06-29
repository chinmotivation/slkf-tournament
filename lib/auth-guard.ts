import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden } from '@/lib/api-response'
import type { UserRole } from '@/types/database'
import type { NextResponse } from 'next/server'

// ─── Auth guard for API route handlers ───────────────────────────────────────

export interface AuthContext {
  userId: string
  role: UserRole
  full_name: string
  is_active: boolean
}

type ProfileRow = { role: string; full_name: string; is_active: boolean }

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return unauthorized()
  }

  // Explicit cast is required because Supabase CLI-generated types fully resolve
  // generic inference, but our hand-written Database type does not. The shape
  // is guaranteed by the migration schema.
  const result = await supabase
    .from('profiles')
    .select('role, full_name, is_active')
    .eq('id', user.id)
    .single()

  const data = result.data as ProfileRow | null

  if (!data || !data.is_active) {
    return unauthorized('Your account has been deactivated. Contact SLKF.')
  }

  return {
    userId: user.id,
    role: data.role as UserRole,
    full_name: data.full_name,
    is_active: data.is_active,
  }
}

export async function requireRole(role: UserRole): Promise<AuthContext | NextResponse> {
  const result = await requireAuth()
  if (isNextResponse(result)) return result
  if (result.role !== role) return forbidden()
  return result
}

export function requireHeadMaster() {
  return requireRole('head_master')
}

export function requireStudent() {
  return requireRole('student')
}

export function requireAdminOrHM(): Promise<AuthContext | NextResponse> {
  return requireAuth().then(result => {
    if (isNextResponse(result)) return result
    if (result.role !== 'head_master' && result.role !== 'super_admin') return forbidden()
    return result
  })
}

export function requireReferee() {
  return requireRole('referee')
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof Response
}
