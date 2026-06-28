'use client'

import { useEffect, useRef, useState } from 'react'

type ToastVariant = 'error' | 'warning' | 'success'

interface ToastProps {
  message: string | null
  variant?: ToastVariant
  onClear: () => void
  duration?: number
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  error: (
    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const BG: Record<ToastVariant, string> = {
  error:   'bg-red-600',
  warning: 'bg-amber-500',
  success: 'bg-green-600',
}

export function Toast({ message, variant = 'error', onClear, duration = 5000 }: ToastProps) {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (message) {
      setShow(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => dismiss(), duration)
    } else {
      setShow(false)
    }
    return () => { if (timer.current) clearTimeout(timer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message])

  function dismiss() {
    setShow(false)
    setTimeout(onClear, 350)
  }

  if (!message) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed top-0 left-0 right-0 z-[100]
        flex items-start gap-3 px-4 py-4
        text-white shadow-2xl
        transition-transform duration-300 ease-out
        ${BG[variant]}
        ${show ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      {ICONS[variant]}
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 opacity-75 hover:opacity-100 transition-opacity p-0.5"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
