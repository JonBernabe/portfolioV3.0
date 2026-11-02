import { getNow, getSeason } from '../3D/calendar'
import Text from '../Text/Text'

type LoaderProps = {
  progress: number
  done: boolean
}

export default function Loader({ progress, done }: LoaderProps) {
  const isChristmas = getSeason(getNow()).festivity === 'pasko'

  return (
    <div
      role="status"
      className={`fixed inset-0 z-50 grid place-items-center bg-paper transition-[opacity,visibility] duration-900 ${
        done ? 'invisible opacity-0' : ''
      }`}
    >
      <div className="flex flex-col items-center gap-[22px]">
        <div className={isChristmas ? 'parol' : 'kubo'} aria-hidden="true" />
        <Text
          as="h1"
          className="font-display text-[13px] font-bold tracking-[.3em]"
        >
          LOADING
        </Text>
        <Text className="text-xs text-dim">sandali lang po…</Text>
        <div className="h-0.5 w-[140px] overflow-hidden rounded-[2px] bg-line">
          <i
            className="block h-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.trunc(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
