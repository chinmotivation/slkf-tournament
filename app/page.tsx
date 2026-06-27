import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (data as { role: string } | null)?.role

  redirect(role === 'head_master' ? '/head-master/dashboard' : '/association/dashboard')
}
