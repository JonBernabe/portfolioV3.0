type BambooFrameProps = {
  small?: boolean
}

const CORNERS = ['lashing-nw', 'lashing-ne', 'lashing-sw', 'lashing-se']

function LeafTuft({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`bamboo-leaves ${className}`}>
      <path
        d="M8 56C14 38 16 20 30 4c8 18-2 40-22 52Z"
        fill="#3f7a35"
        stroke="#2c5a26"
      />
      <path
        d="M8 56C28 44 46 42 62 48 46 60 26 62 8 56Z"
        fill="#5c9a45"
        stroke="#3f7a35"
      />
      <path
        d="M8 56C18 30 38 14 60 10 50 34 32 50 8 56Z"
        fill="#4f8a3c"
        stroke="#2c5a26"
      />
    </svg>
  )
}

// Sits over the sign it frames; the sign's parent has to be positioned.
export default function BambooFrame({ small = false }: BambooFrameProps) {
  return (
    <div
      aria-hidden="true"
      className={`bamboo-frame ${small ? 'bamboo-frame-small' : ''}`}
    >
      <i className="bamboo bamboo-frame-top" />
      <i className="bamboo bamboo-frame-bottom" />
      <i className="bamboo bamboo-upright bamboo-frame-left" />
      <i className="bamboo bamboo-upright bamboo-frame-right" />
      {CORNERS.map((corner) => (
        <i key={corner} className={`lashing ${corner}`} />
      ))}
      <LeafTuft className="bamboo-leaves-top" />
      <LeafTuft className="bamboo-leaves-bottom" />
    </div>
  )
}
