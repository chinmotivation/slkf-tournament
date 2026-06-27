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

export default function ApplicationCard({ application: app }: { application: ApplicationListItem }) {
  const isDraft = app.status === 'DRAFT'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-4 hover:border-gray-200 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
            {app.tournament_code} · {app.tournament_year}
          </p>
          <h3 className="text-base font-bold text-gray-900 leading-snug">{app.tournament_name}</h3>
        </div>
        <ApplicationStatusBadge status={app.status} />
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>
            {app.athlete_count} athlete{app.athlete_count !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {app.submitted_at
              ? `Submitted ${formatDate(app.submitted_at)}`
              : `Last updated ${formatDate(app.updated_at)}`}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-50">
        <Link
          href={`/association/applications/${app.id}`}
          className={`block text-center text-sm font-medium py-2 rounded-lg transition-colors ${
            isDraft
              ? 'text-white bg-red-600 hover:bg-red-700'
              : 'text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          {isDraft ? 'Edit Application' : 'View Application'}
        </Link>
      </div>
    </div>
  )
}
