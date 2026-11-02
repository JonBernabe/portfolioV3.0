import { useSyncExternalStore } from 'react'
import { isSectionId, type SectionId } from '../Components/Page/sections'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function readSection(): SectionId | null {
  const id = window.location.hash.slice(1)
  return isSectionId(id) ? id : null
}

export function navigateToSection(id: SectionId | null) {
  window.location.hash = id ?? ''
}

export function useHashSection() {
  return useSyncExternalStore(subscribe, readSection)
}
