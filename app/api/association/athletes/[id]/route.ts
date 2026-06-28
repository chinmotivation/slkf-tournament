import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAssociationRep, isNextResponse } from '@/lib/auth-guard'
import { ok, notFound, serverError, validationError } from '@/lib/api-response'
import { updateRosterAthleteSchema } from '@/lib/validations/athlete'
import { ZodError } from 'zod'
import type { Athlete } from '@/types/database'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAssociationRep()
  if (isNextResponse(auth)) return auth

  const { id } = await params

  try {
    const body = await req.json()
    const validated = updateRosterAthleteSchema.parse(body)

    const supabase = await createClient()
    const db = supabase as any

    const assocResult = await supabase
      .from('associations')
      .select('id')
      .eq('user_id', auth.userId)
      .single()
    const assoc = assocResult.data as { id: string } | null
    if (!assoc) return serverError('Association profile not found.')

    // RLS already enforces ownership; the association_id check is belt-and-suspenders
    const { data, error } = await db
      .from('athletes')
      .update({
        ...validated,
        updated_by: auth.userId,
      })
      .eq('id', id)
      .eq('association_id', assoc.id)
      .select('*')
      .single()

    if (error || !data) return notFound('Athlete')
    return ok(data as Athlete)
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return serverError()
  }
}
