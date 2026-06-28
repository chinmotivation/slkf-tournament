import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAssociationRep, isNextResponse } from '@/lib/auth-guard'
import { ok, created, serverError, validationError } from '@/lib/api-response'
import { rosterAthleteSchema } from '@/lib/validations/athlete'
import { ZodError } from 'zod'
import type { Athlete } from '@/types/database'

export async function GET(): Promise<NextResponse> {
  const auth = await requireAssociationRep()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  const db = supabase as any

  const assocResult = await supabase
    .from('associations')
    .select('id')
    .eq('user_id', auth.userId)
    .single()
  const assoc = assocResult.data as { id: string } | null
  if (!assoc) return ok([] as Athlete[])

  const { data, error } = await db
    .from('athletes')
    .select('*')
    .eq('association_id', assoc.id)
    .order('full_name')

  if (error) return serverError()
  return ok((data ?? []) as Athlete[])
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAssociationRep()
  if (isNextResponse(auth)) return auth

  try {
    const body = await req.json()
    const validated = rosterAthleteSchema.parse(body)

    const supabase = await createClient()
    const db = supabase as any

    const assocResult = await supabase
      .from('associations')
      .select('id')
      .eq('user_id', auth.userId)
      .single()
    const assoc = assocResult.data as { id: string } | null
    if (!assoc) return serverError('Association profile not found.')

    const { data, error } = await db
      .from('athletes')
      .insert({
        association_id: assoc.id,
        full_name: validated.full_name,
        date_of_birth: validated.date_of_birth,
        gender: validated.gender,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select('*')
      .single()

    if (error) return serverError()
    return created(data as Athlete, 'Athlete added to roster.')
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return serverError()
  }
}
