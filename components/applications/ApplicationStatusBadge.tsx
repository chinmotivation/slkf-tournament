import type { ApplicationStatus } from '@/types/database'

const config: Record<ApplicationStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  PENDING_VERIFICATION: { label: 'Pending Verification', className: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
}

export default function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, className } = config[status] ?? config.DRAFT
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
