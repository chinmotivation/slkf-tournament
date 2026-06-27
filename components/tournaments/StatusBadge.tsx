import type { TournamentStatus } from '@/types/database'

const config: Record<TournamentStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  OPEN: { label: 'Published', className: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Closed', className: 'bg-orange-100 text-orange-700' },
  ARCHIVED: { label: 'Archived', className: 'bg-gray-100 text-gray-400' },
}

interface Props {
  status: TournamentStatus
}

export default function StatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? config.DRAFT
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
