import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { noContent, serverError, notFound } from '@/lib/api-response'
import type { RouteHandler } from '@/types/next'

// DELETE /api/tournaments/:id/tatamis/:tatamiId — remove a tatami
export const DELETE: RouteHandler<{ id: string; tatamiId: string }> = async (_req, ctx) => {
  const { id, tatamiId } = await ctx.params

  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: existing } = await db
    .from('tournament_tatamis')
    .select('id')
    .eq('id', tatamiId)
    .eq('tournament_id', id)
    .single()

  if (!existing) return notFound('Tatami')

  const { error } = await db
    .from('tournament_tatamis')
    .delete()
    .eq('id', tatamiId)

  if (error) return serverError()
  return noContent()
}
