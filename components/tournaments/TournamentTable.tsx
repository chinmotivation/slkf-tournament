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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-12 text-center">
        <p className="text-gray-500 dark:text-slate-400 text-sm">No tournaments yet. Create your first tournament.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Tournament</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Year</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Deadline</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
          {tournaments.map(t => (
            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <td className="px-6 py-4">
                <div>
                  <p className="font-semibold text-indigo-900 dark:text-indigo-300">{t.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t.code}</p>
                </div>
              </td>
              <td className="px-4 py-4 text-gray-600 dark:text-slate-400">{t.year}</td>
              <td className="px-4 py-4 text-gray-600 dark:text-slate-400">{formatDate(t.registration_deadline)}</td>
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
                    className="text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 px-3 py-1 rounded-md transition-colors"
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
