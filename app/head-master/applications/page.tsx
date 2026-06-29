import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicationsManager from './ApplicationsManager'
import type { EnrichedApp } from './ApplicationsManager'

export const metadata = { title: 'Payment Verification — SLKF Head Master' }

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any
  const { tournament: selectedId } = await searchParams

  // Load HM's tournaments for the filter tabs
  const { data: tournamentsData } = await db
    .from('tournaments')
    .select('id, name, status')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const tourneyList = (tournamentsData ?? []) as { id: string; name: string; status: string }[]

  const activeTournament = selectedId
    ? tourneyList.find(t => t.id === selectedId)
    : (tourneyList.find(t => t.status === 'OPEN') ?? tourneyList[0])

  // Load applications for the active tournament
  let applications: EnrichedApp[] = []

  if (activeTournament) {
    const { data } = await db
      .from('student_applications')
      .select('*')
      .eq('tournament_id', activeTournament.id)
      .order('created_at', { ascending: true })
    applications = data ?? []
  } else if (tourneyList.length > 0) {
    // No tournament found — load all for this HM's tournaments
    const { data } = await db
      .from('student_applications')
      .select('*')
      .in('tournament_id', tourneyList.map(t => t.id))
      .order('created_at', { ascending: true })
    applications = data ?? []
  }

  // Generate signed URLs for receipts (admin client bypasses RLS on storage)
  const admin = createAdminClient() as any
  const signedUrlsMap: Record<string, string> = {}
  await Promise.all(
    applications
      .filter(a => a.payment_receipt_url)
      .map(async a => {
        const { data } = await admin.storage
          .from('payment-receipts')
          .createSignedUrl(a.payment_receipt_url!, 60 * 60)
        if (data?.signedUrl) signedUrlsMap[a.id] = data.signedUrl
      })
  )

  // Build team members map: team_kata_team_name → [full_names of all members with that name]
  const teamMembersMap: Record<string, string[]> = {}
  for (const app of applications) {
    if (app.team_kata_entry && app.team_kata_team_name) {
      const key = app.team_kata_team_name
      if (!teamMembersMap[key]) teamMembersMap[key] = []
      if (!teamMembersMap[key].includes(app.full_name)) {
        teamMembersMap[key].push(app.full_name)
      }
    }
  }

  const pending  = applications.filter(a => a.status === 'PENDING').length
  const approved = applications.filter(a => a.status === 'APPROVED').length
  const rejected = applications.filter(a => a.status === 'REJECTED').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/head-master/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900">Payment Verification</h1>
            {activeTournament ? (
              <p className="text-xs text-gray-500 truncate">
                {activeTournament.name} · {pending} pending · {approved} approved · {rejected} rejected
              </p>
            ) : (
              <p className="text-xs text-gray-500">No tournaments found</p>
            )}
          </div>
        </div>
      </header>

      {/* Pending alert banner */}
      {pending > 0 && (
        <div className="bg-amber-500 text-white">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium">
              {pending} application{pending !== 1 ? 's' : ''} waiting for payment verification
            </p>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">

        {/* Tournament filter tabs */}
        {tourneyList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tourneyList.map(t => (
              <Link
                key={t.id}
                href={`/head-master/applications?tournament=${t.id}`}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                  activeTournament?.id === t.id
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}

        {tourneyList.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            <p>No tournaments found.</p>
            <p className="mt-1 text-xs">Create a tournament to start receiving applications.</p>
          </div>
        )}

        {activeTournament && (
          <ApplicationsManager
            applications={applications}
            signedUrls={signedUrlsMap}
            teamMembersMap={teamMembersMap}
            tournamentName={activeTournament.name}
          />
        )}
      </main>
    </div>
  )
}
