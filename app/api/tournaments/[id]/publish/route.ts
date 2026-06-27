import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, conflict } from '@/lib/api-response'
import type { RouteHandler } from '@/types/next'
import type { Tournament } from '@/types/database'

// POST /api/tournaments/:id/publish — head master: set status DRAFT → OPEN
export const POST: RouteHandler<{ id: string }> = async (_req, ctx) => {
  const { id } = await ctx.params

  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const fetchResult = await db.from('tournaments').select('*').eq('id', id).single()
  if (fetchResult.error || !fetchResult.data) return notFound('Tournament')
  const existing = fetchResult.data as Tournament

  if (existing.status === 'OPEN') {
    return conflict('Tournament is already published.', 'ALREADY_PUBLISHED')
  }

  if (existing.status === 'CLOSED' || existing.status === 'ARCHIVED') {
    return conflict('Only draft tournaments can be published.', 'INVALID_STATUS')
  }

  if (!existing.bank_account_name || !existing.bank_account_number || !existing.bank_name || !existing.bank_branch) {
    return serverError('Bank details are required before publishing.')
  }

  const updateResult = await db
    .from('tournaments')
    .update({ status: 'OPEN', updated_by: auth.userId })
    .eq('id', id)
    .select('id, name, status')
    .single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data as Pick<Tournament, 'id' | 'name' | 'status'>)
}
