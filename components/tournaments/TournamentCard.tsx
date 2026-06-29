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
  const warning = t.registration_deadline ? deadlineWarning(t.registration_deadline) : null
  const venues = [t.venue_u14, t.venue_cadet_junior, t.venue_u21_senior].filter(Boolean)
  const venueDisplay = venues[0] ?? null

  return (
    <div className="card card-lift flex flex-col overflow-hidden">
      {/* Colored accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-red-600 to-rose-500 shrink-0" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.1em] mb-1.5">
              {t.code} · {t.year}
            </p>
            <h3 className="text-[15px] font-bold text-gray-900 leading-snug">{t.name}</h3>
            {t.subtitle && (
              <p className="text-sm text-gray-500 mt-0.5 leading-snug">{t.subtitle}</p>
            )}
          </div>
          {warning && (
            <span className={`badge shrink-0 ${
              warning.urgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {warning.label}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-col gap-1.5">
          {venueDisplay && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{venueDisplay}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Deadline: <span className="font-semibold text-gray-700">{formatDate(t.registration_deadline)}</span></span>
          </div>
        </div>

        {/* Action row */}
        <div className="pt-3 border-t border-gray-100 flex gap-2 mt-auto">
          <Link
            href={`/tournaments/${t.id}`}
            className="btn btn-secondary btn-sm flex-1 text-center"
          >
            Details
          </Link>
          <Link
            href={`/tournaments/${t.id}#apply`}
            className="btn btn-primary btn-sm flex-1 text-center"
          >
            Apply Now
          </Link>
        </div>
      </div>
    </div>
  )
}
