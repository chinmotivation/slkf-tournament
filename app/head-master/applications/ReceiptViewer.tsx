'use client'

import { useState, useRef, useEffect } from 'react'

export default function ReceiptViewer({ url, filename }: { url: string; filename: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const pinchDist = useRef<number | null>(null)
  const pinchScale = useRef(1)

  function openModal() {
    setOpen(true)
    setLoaded(false)
    setLoadError(false)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  function closeModal() {
    setOpen(false)
  }

  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Non-passive wheel listener so preventDefault works
  useEffect(() => {
    const el = containerRef.current
    if (!el || !open) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setScale(s => Math.min(6, Math.max(0.5, s + e.deltaY * -0.002)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [open])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    e.preventDefault()
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    })
  }
  function onMouseUp() { dragging.current = false }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDist.current = Math.hypot(dx, dy)
      pinchScale.current = scale
    } else if (e.touches.length === 1) {
      dragging.current = true
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        ox: offset.x,
        oy: offset.y,
      }
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      setScale(Math.min(6, Math.max(0.5, pinchScale.current * (dist / pinchDist.current))))
    } else if (e.touches.length === 1 && dragging.current) {
      setOffset({
        x: dragStart.current.ox + e.touches[0].clientX - dragStart.current.x,
        y: dragStart.current.oy + e.touches[0].clientY - dragStart.current.y,
      })
    }
  }
  function onTouchEnd() {
    dragging.current = false
    pinchDist.current = null
  }

  function resetZoom() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openModal}
        className="w-full flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl px-4 py-3 transition-colors group text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center shrink-0 transition-colors">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">View Payment Receipt</p>
          <p className="text-xs text-gray-400 truncate">{filename}</p>
        </div>
        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6m0 0v6m0-6L10 14" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={closeModal}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-white text-sm font-medium">Payment Receipt</p>
              <p className="text-white/50 text-xs truncate max-w-[200px]">{filename}</p>
            </div>
            <div className="flex items-center gap-2">
              {loaded && scale !== 1 && (
                <button
                  onClick={resetZoom}
                  className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Reset zoom
                </button>
              )}
              <button
                onClick={closeModal}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden flex items-center justify-center relative select-none"
            style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={e => e.stopPropagation()}
          >
            {/* Loading spinner */}
            {!loaded && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/60 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {/* Load error */}
            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-white/50 text-sm">Could not load receipt</p>
              </div>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Payment receipt"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => setLoadError(true)}
              className="max-w-full max-h-full object-contain transition-opacity duration-200"
              style={{
                opacity: loaded ? 1 : 0,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                willChange: 'transform',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            />
          </div>

          {/* Bottom hint */}
          {loaded && (
            <div className="shrink-0 py-3 text-center" onClick={e => e.stopPropagation()}>
              <p className="text-white/30 text-xs">
                Scroll or pinch to zoom · Drag to pan · Tap outside to close
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
