import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, badRequest, conflict } from '@/lib/api-response'
import { z } from 'zod'

const schema = z.object({
  dojo_code: z.string()
    .min(2, 'Dojo code must be at least 2 characters')
    .max(6, 'Dojo code must be at most 6 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Only letters and numbers — no spaces or symbols')
    .transform(v => v.toUpperCase()),
})

export async function GET() {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  const db = supabase as any
  const { data, error } = await db
    .from('associations')
    .select('dojo_code, association_name, district, instructor_name, logo_url')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) { console.error('[settings GET]', error); return serverError() }
  return ok(data ?? {})
}

export async function PUT(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  let body: unknown
  try { body = await request.json() } catch { return badRequest('Invalid JSON') }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const supabase = await createClient()
  const db = supabase as any

  const { data, error } = await db
    .from('associations')
    .upsert(
      { user_id: auth.userId, dojo_code: parsed.data.dojo_code },
      { onConflict: 'user_id' }
    )
    .select('dojo_code, association_name, district, instructor_name, logo_url')
    .single()

  if (error) {
    console.error('[settings PUT]', error)
    if (error.code === '23505') return conflict('This dojo code is already taken. Choose a different one.')
    return serverError()
  }

  return ok(data)
}
