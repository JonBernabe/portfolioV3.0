import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
}

export default function Card({ children }: CardProps) {
  return (
    <div className="mb-3 rounded-md border border-line bg-white/45 p-4 transition-[border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-accent">
      {children}
    </div>
  )
}
