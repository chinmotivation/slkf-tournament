import Link from 'next/link'
import type { Tournament } from '@/types/database'
import StatusBadge from './StatusBadge'
import PublishButton from './PublishButton'

interface Props {
  tournaments: Tournament[]
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TournamentTable({ tournaments }: Props) {
  if (tournaments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <p className="text-gray-500 text-sm">No tournaments yet. Create your first tournament.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tournament</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deadline</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tournaments.map(t => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.code}</p>
                </div>
              </td>
              <td className="px-4 py-4 text-gray-600">{t.year}</td>
              <td className="px-4 py-4 text-gray-600">{formatDate(t.registration_deadline)}</td>
              <td className="px-4 py-4">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-3">
                  {t.status === 'DRAFT' && (
                    <PublishButton tournamentId={t.id} tournamentName={t.name} />
                  )}
                  <Link
                    href={`/head-master/tournaments/${t.id}/edit`}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1 rounded-md transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/tournaments/${t.id}`}
                    className="text-sm font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-md transition-colors"
                  >
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
