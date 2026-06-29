import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrHM, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound } from '@/lib/api-response'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAdminOrHM()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  const db = supabase as any

  const { data: existing } = await db
    .from('hm_classes')
    .select('id')
    .eq('id', id)
    .eq('hm_user_id', auth.userId)
    .single()

  if (!existing) return notFound('Class')

  const { error } = await db.from('hm_classes').delete().eq('id', id)
  if (error) return serverError()
  return ok({ deleted: true })
}
