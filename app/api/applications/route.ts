import { createClient } from '@/lib/supabase/server'
import { requireAssociationRep, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError } from '@/lib/api-response'
import type { Application } from '@/types/database'

export interface ApplicationListItem {
  id: string
  tournament_id: string
  tournament_name: string
  tournament_code: string
  tournament_year: number
  status: Application['status']
  submitted_at: string | null
  athlete_count: number
  updated_at: string
}

export async function GET() {
  const auth = await requireAssociationRep()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const assocResult = await supabase
    .from('associations')
    .select('id')
    .eq('user_id', auth.userId)
    .single()
  const assoc = assocResult.data as { id: string } | null
  if (!assoc) return ok([])

  const appsResult = await db
    .from('applications')
    .select('*, tournaments(name, code, year)')
    .eq('association_id', assoc.id)
    .order('updated_at', { ascending: false })

  if (appsResult.error) return serverError()
  type AppRow = Application & { tournaments: { name: string; code: string; year: number } }
  const apps = (appsResult.data ?? []) as AppRow[]
  if (apps.length === 0) return ok<ApplicationListItem[]>([])

  const appIds = apps.map(a => a.id)
  const entriesResult = await db
    .from('individual_entries')
    .select('application_id')
    .in('application_id', appIds)
    .is('deleted_at', null)

  const counts: Record<string, number> = {}
  for (const entry of (entriesResult.data ?? []) as { application_id: string }[]) {
    counts[entry.application_id] = (counts[entry.application_id] ?? 0) + 1
  }

  const list: ApplicationListItem[] = apps.map(app => ({
    id: app.id,
    tournament_id: app.tournament_id,
    tournament_name: app.tournaments?.name ?? '',
    tournament_code: app.tournaments?.code ?? '',
    tournament_year: app.tournaments?.year ?? 0,
    status: app.status,
    submitted_at: app.submitted_at,
    athlete_count: counts[app.id] ?? 0,
    updated_at: app.updated_at,
  }))

  return ok(list)
}
