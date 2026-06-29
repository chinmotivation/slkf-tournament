import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrHM, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, validationError } from '@/lib/api-response'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  kata_approved:      z.boolean().nullable().optional(),
  kumite_approved:    z.boolean().nullable().optional(),
  team_kata_approved: z.boolean().nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAdminOrHM()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  const db = supabase as any

  const appResult = await db.from('student_applications').select('id').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')

  const updates: Record<string, boolean | null> = {}
  if (parsed.data.kata_approved      !== undefined) updates.kata_approved      = parsed.data.kata_approved
  if (parsed.data.kumite_approved    !== undefined) updates.kumite_approved    = parsed.data.kumite_approved
  if (parsed.data.team_kata_approved !== undefined) updates.team_kata_approved = parsed.data.team_kata_approved

  if (Object.keys(updates).length === 0) return ok({})

  const result = await db.from('student_applications').update(updates).eq('id', id).select().single()
  if (result.error) return serverError()
  return ok(result.data)
}
