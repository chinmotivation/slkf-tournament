'use client'

import QRCode from 'react-qr-code'

interface Props {
  token: string
  size?: number
  label?: string
}

export default function QrCodeDisplay({ token, size = 160, label }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl border border-gray-200 inline-block">
        <QRCode value={token} size={size} level="M" />
      </div>
      {label && (
        <p className="text-xs text-gray-500 text-center">{label}</p>
      )}
    </div>
  )
}
