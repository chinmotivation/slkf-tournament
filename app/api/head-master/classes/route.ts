import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrHM, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, validationError, conflict } from '@/lib/api-response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export async function GET() {
  const auth = await requireAdminOrHM()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  const db = supabase as any

  const { data, error } = await db
    .from('hm_classes')
    .select('id, name, created_at')
    .eq('hm_user_id', auth.userId)
    .order('created_at', { ascending: true })

  if (error) return serverError()
  return ok(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrHM()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  const db = supabase as any

  const { data, error } = await db
    .from('hm_classes')
    .insert({ hm_user_id: auth.userId, name: parsed.data.name })
    .select('id, name, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return conflict('A class with this name already exists.', 'DUPLICATE_NAME')
    return serverError()
  }
  return ok(data)
}
