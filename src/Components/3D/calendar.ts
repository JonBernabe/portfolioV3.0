import { MathUtils } from 'three'

export type Climate = 'amihan' | 'tagInit' | 'tagUlan'
export type Festivity = 'pasko' | 'bagongTaon' | 'puso' | 'flores' | 'kalayaan'

export type Season = {
  climate: Climate
  festivity: Festivity | null
}

export type SkyTime = {
  // 1 at full day, 0 at full night, in between at dawn and dusk.
  daylight: number
  // 0 at sunrise, PI at sunset. Outside that range the sun is below the horizon.
  sunAngle: number
}

type Dated<T> = {
  id: T
  from: number
  to: number
}

const SUNRISE = 6
const SUNSET = 18
const TWILIGHT_HOURS = 0.75

// Dates are month * 100 + day, so 1225 is December 25. A range that starts
// later than it ends wraps around the new year. Holy Week and Chinese New Year
// aren't here because their dates move every year.
const FESTIVITIES: Dated<Festivity>[] = [
  { id: 'bagongTaon', from: 1231, to: 102 },
  { id: 'pasko', from: 1101, to: 1230 },
  { id: 'puso', from: 207, to: 214 },
  { id: 'flores', from: 501, to: 531 },
  { id: 'kalayaan', from: 610, to: 612 },
]

// Anything not listed here is amihan, the cool dry months.
const CLIMATES: Dated<Climate>[] = [
  { id: 'tagInit', from: 301, to: 531 },
  { id: 'tagUlan', from: 601, to: 1031 },
]

export function getSeason(date: Date): Season {
  const day = (date.getMonth() + 1) * 100 + date.getDate()
  const isActive = ({ from, to }: Dated<unknown>) =>
    from <= to ? day >= from && day <= to : day >= from || day <= to

  return {
    climate: CLIMATES.find(isActive)?.id ?? 'amihan',
    festivity: FESTIVITIES.find(isActive)?.id ?? null,
  }
}

export function getSkyTime(date: Date): SkyTime {
  const hours = date.getHours() + date.getMinutes() / 60
  const sunUp = MathUtils.smoothstep(
    hours,
    SUNRISE - TWILIGHT_HOURS,
    SUNRISE + TWILIGHT_HOURS,
  )
  const sunDown = MathUtils.smoothstep(
    hours,
    SUNSET - TWILIGHT_HOURS,
    SUNSET + TWILIGHT_HOURS,
  )

  return {
    daylight: sunUp - sunDown,
    sunAngle: ((hours - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI,
  }
}

// ?at=2026-12-24T20:00 previews any date and hour on the visitor's clock.
export function getNow() {
  const at = new URLSearchParams(location.search).get('at')
  const date = at ? new Date(at) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}
