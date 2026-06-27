import Link from 'next/link'
import type { Tournament } from '@/types/database'

interface Props {
  tournament: Tournament
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function deadlineWarning(deadline: string) {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'Deadline passed', urgent: true }
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, urgent: true }
  if (daysLeft <= 14) return { label: `${daysLeft}d left`, urgent: false }
  return null
}

export default function TournamentCard({ tournament: t }: Props) {
  const warning = deadlineWarning(t.registration_deadline)
  const venues = [t.venue_u14, t.venue_cadet_junior, t.venue_u21_senior].filter(Boolean)
  const venueDisplay = venues[0] ?? null

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-4 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
            {t.code} · {t.year}
          </p>
          <h3 className="text-base font-bold text-gray-900 leading-snug">{t.name}</h3>
          {t.subtitle && <p className="text-sm text-gray-500 mt-0.5">{t.subtitle}</p>}
        </div>
        {warning && (
          <span
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              warning.urgent ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {warning.label}
          </span>
        )}
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        {venueDisplay && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{venueDisplay}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Registration deadline: <strong>{formatDate(t.registration_deadline)}</strong></span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-50 flex gap-3">
        <Link
          href={`/tournaments/${t.id}`}
          className="flex-1 text-center text-sm font-medium text-gray-700 border border-gray-200 hover:border-gray-300 py-2 rounded-lg transition-colors"
        >
          View Details
        </Link>
        <Link
          href={`/tournaments/${t.id}#apply`}
          className="flex-1 text-center text-sm font-medium text-white bg-red-600 hover:bg-red-700 py-2 rounded-lg transition-colors"
        >
          Apply
        </Link>
      </div>
    </div>
  )
}
