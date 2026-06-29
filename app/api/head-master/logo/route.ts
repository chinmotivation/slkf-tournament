import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, badRequest, serverError } from '@/lib/api-response'

const BUCKET = 'dojo-logos'
const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

export async function POST(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  let formData: FormData
  try { formData = await request.formData() } catch { return badRequest('Invalid form data') }

  const file = formData.get('logo')
  if (!(file instanceof File)) return badRequest('No file provided')
  if (!ALLOWED_TYPES.includes(file.type)) return badRequest('Only JPEG or PNG images are allowed')
  if (file.size > MAX_BYTES) return badRequest('File must be smaller than 3 MB')

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${auth.userId}/logo.${ext}`

  const supabase = await createClient()
  const db = supabase as any

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[logo upload]', uploadError)
    return serverError('Failed to upload logo. Please try again.')
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path)
  const logo_url: string = urlData.publicUrl

  const { data, error: dbError } = await db
    .from('associations')
    .update({ logo_url })
    .eq('user_id', auth.userId)
    .select('logo_url')
    .single()

  if (dbError) {
    console.error('[logo db update]', dbError)
    return serverError('Logo uploaded but could not save URL. Please try again.')
  }

  return ok(data)
}

export async function DELETE() {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db
    .from('associations')
    .update({ logo_url: null })
    .eq('user_id', auth.userId)

  if (error) return serverError()
  return ok({ logo_url: null })
}
