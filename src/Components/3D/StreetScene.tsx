import { useEffect, useRef } from 'react'
import { SECTIONS, type SectionId } from '../Page/sections'
import { createStreet, type Street } from './createStreet'

type StreetSceneProps = {
  section: SectionId | null
  onSelect: (id: SectionId | null) => void
  onInteract: () => void
  onProgress: (progress: number) => void
  onReady: () => void
  onUnsupported: () => void
}

export default function StreetScene({
  section,
  onSelect,
  onInteract,
  onProgress,
  onReady,
  onUnsupported,
}: StreetSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const streetRef = useRef<Street | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Written straight to the DOM so pointer moves don't re-render React.
    function showTip(id: SectionId | null, event?: PointerEvent) {
      const tip = tipRef.current
      if (!tip) return
      if (id && event) {
        tip.textContent = `${SECTIONS[id].label} →`
        tip.style.left = `${event.clientX}px`
        tip.style.top = `${event.clientY}px`
        tip.style.opacity = '1'
      } else {
        tip.style.opacity = '0'
      }
    }

    try {
      const street = createStreet(mount, {
        onSelect,
        onHover: showTip,
        onInteract,
        onProgress,
        onReady,
      })
      streetRef.current = street

      return () => {
        street.dispose()
        streetRef.current = null
      }
    } catch {
      onUnsupported()
    }
  }, [onSelect, onInteract, onProgress, onReady, onUnsupported])

  useEffect(() => {
    streetRef.current?.focus(section)
  }, [section])

  return (
    <>
      <div ref={mountRef} aria-hidden="true" className="fixed inset-0" />
      <div
        ref={tipRef}
        className="pointer-events-none fixed z-11 translate-x-3.5 translate-y-3.5 plank px-2.5 py-1.5 font-display text-[11px] font-bold tracking-[.1em] opacity-0 transition-opacity duration-150"
      />
    </>
  )
}
