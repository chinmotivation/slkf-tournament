import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, conflict, badRequest } from '@/lib/api-response'
import type { RouteHandler } from '@/types/next'
import type { Tournament } from '@/types/database'

// POST /api/tournaments/:id/publish — head master: validate checklist then set DRAFT → OPEN
export const POST: RouteHandler<{ id: string }> = async (_req, ctx) => {
  const { id } = await ctx.params

  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const fetchResult = await db.from('tournaments').select('*').eq('id', id).single()
  if (fetchResult.error || !fetchResult.data) return notFound('Tournament')
  const t = fetchResult.data as Tournament

  if (t.status === 'OPEN') {
    return conflict('Tournament is already published.', 'ALREADY_PUBLISHED')
  }
  if (t.status === 'CLOSED' || t.status === 'ARCHIVED') {
    return conflict('Only draft tournaments can be published.', 'INVALID_STATUS')
  }

  // ── Validation checklist ────────────────────────────────────────────────────
  const failures: string[] = []

  // 1. Bank details
  if (!t.bank_account_name || !t.bank_account_number || !t.bank_name || !t.bank_branch) {
    failures.push('Bank payment details must be complete.')
  }

  // 2. At least one event type enabled
  const anyEvent = t.enable_individual_kata || t.enable_team_kata || t.enable_individual_kumite || t.enable_team_kumite
  if (!anyEvent) {
    failures.push('At least one competition type must be enabled.')
  }

  // 3. Registration deadline set (always required in schema; belt-and-suspenders)
  if (!t.registration_deadline) {
    failures.push('Registration deadline is required.')
  }

  // 4. Age eligibility cutoff set
  if (!t.age_eligibility_cutoff_date) {
    failures.push('Age eligibility cutoff date is required.')
  }

  // 5. At least one tatami configured
  const adminDb = createAdminClient() as any
  const { data: tatamis } = await adminDb
    .from('tournament_tatamis')
    .select('id')
    .eq('tournament_id', id)
    .eq('is_active', true)
    .limit(1)

  if (!tatamis || tatamis.length === 0) {
    failures.push('At least one tatami must be configured before publishing.')
  }

  // 6. At least one age category configured
  const { data: ageCategories } = await adminDb
    .from('tournament_age_categories')
    .select('id')
    .eq('tournament_id', id)
    .limit(1)

  if (!ageCategories || ageCategories.length === 0) {
    failures.push('At least one age category must be configured before publishing.')
  }

  if (failures.length > 0) {
    return badRequest(
      `Cannot publish: ${failures.join(' ')}`,
      Object.fromEntries(failures.map((f, i) => [`step_${i + 1}`, f]))
    )
  }
  // ── End checklist ───────────────────────────────────────────────────────────

  const now = new Date().toISOString()
  const updateResult = await db
    .from('tournaments')
    .update({ status: 'OPEN', published_at: now, updated_by: auth.userId })
    .eq('id', id)
    .select('id, name, status, published_at')
    .single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data as Pick<Tournament, 'id' | 'name' | 'status' | 'published_at'>)
}
