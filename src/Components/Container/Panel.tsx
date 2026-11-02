import type { CSSProperties, ReactNode } from 'react'
import { SECTIONS, type SectionId } from '../Page/sections'
import BambooFrame from './BambooFrame'

type PanelProps = {
  section: SectionId
  open: boolean
  onClose: () => void
  children: ReactNode
}

export default function Panel({ section, open, onClose, children }: PanelProps) {
  const { label, paint } = SECTIONS[section]

  return (
    <aside
      aria-live="polite"
      inert={!open}
      style={{ '--color-accent': paint, '--c': paint } as CSSProperties}
      className={`fixed inset-x-4 bottom-4 z-20 h-[60vh] transition-transform duration-700 ease-panel md:top-6 md:right-6 md:bottom-6 md:left-auto md:h-auto md:w-[min(440px,calc(100vw-48px))] ${
        open
          ? 'translate-y-0 md:translate-x-0'
          : 'translate-y-[calc(100%+30px)] md:translate-x-[calc(100%+40px)] md:translate-y-0'
      }`}
    >
      <BambooFrame />
      <div className="abaca flex h-full flex-col overflow-hidden">
        <header className="flex items-start justify-between px-[22px]">
          <span className="plank hanging mt-3.5 px-3 py-1.5 font-display text-xs font-bold tracking-[.14em]">
            {label}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="plank mt-3.5 grid size-9 place-items-center text-[18px] leading-none transition-[filter] hover:brightness-110"
          >
            ×
          </button>
        </header>
        <div
          key={section}
          className="flex-1 overflow-y-auto px-[22px] pt-3.5 pb-[26px]"
        >
          {children}
        </div>
      </div>
    </aside>
  )
}
