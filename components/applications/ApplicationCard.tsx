import Link from 'next/link'
import ApplicationStatusBadge from './ApplicationStatusBadge'
import type { ApplicationStatus } from '@/types/database'

export interface ApplicationListItem {
  id: string
  tournament_id: string
  tournament_name: string
  tournament_code: string
  tournament_year: number
  status: ApplicationStatus
  submitted_at: string | null
  athlete_count: number
  updated_at: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_BAR: Record<ApplicationStatus, string> = {
  DRAFT:                'bg-gradient-to-r from-amber-400 to-yellow-400',
  SUBMITTED:            'bg-gradient-to-r from-blue-500 to-indigo-400',
  PENDING_VERIFICATION: 'bg-gradient-to-r from-violet-500 to-purple-400',
  APPROVED:             'bg-gradient-to-r from-green-500 to-emerald-400',
  REJECTED:             'bg-gradient-to-r from-red-500 to-rose-400',
}

export default function ApplicationCard({ application: app }: { application: ApplicationListItem }) {
  const isDraft = app.status === 'DRAFT'

  return (
    <div className="card flex flex-col overflow-hidden">
      {/* Status-coloured accent bar */}
      <div className={`h-[3px] shrink-0 ${STATUS_BAR[app.status] ?? 'bg-gray-200'}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.1em] mb-1.5">
              {app.tournament_code} · {app.tournament_year}
            </p>
            <h3 className="text-[15px] font-bold text-gray-900 leading-snug">{app.tournament_name}</h3>
          </div>
          <ApplicationStatusBadge status={app.status} />
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              <span className="font-semibold text-gray-700">{app.athlete_count}</span>{' '}
              athlete{app.athlete_count !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {app.submitted_at
                ? `Submitted ${formatDate(app.submitted_at)}`
                : `Updated ${formatDate(app.updated_at)}`}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="pt-3 border-t border-gray-100 mt-auto">
          <Link
            href={`/association/applications/${app.id}`}
            className={`btn w-full ${isDraft ? 'btn-primary btn-md' : 'btn-secondary btn-md'}`}
          >
            {isDraft ? 'Edit Application' : 'View Application'}
          </Link>
        </div>
      </div>
    </div>
  )
}
