import { createClient } from '@/lib/supabase/server'
import { ok, serverError } from '@/lib/api-response'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return ok({ message: 'Logged out successfully.' })
  } catch {
    return serverError()
  }
}
