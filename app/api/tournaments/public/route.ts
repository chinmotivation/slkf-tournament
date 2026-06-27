import { createClient } from '@/lib/supabase/server'
import { requireAuth, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError } from '@/lib/api-response'
import type { Tournament } from '@/types/database'

// GET /api/tournaments/public — authenticated users: list published (OPEN) tournaments only
export async function GET() {
  const auth = await requireAuth()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const result = await db
    .from('tournaments')
    .select('*')
    .eq('status', 'OPEN')
    .order('registration_deadline', { ascending: true })

  if (result.error) return serverError()
  return ok((result.data ?? []) as Tournament[])
}
