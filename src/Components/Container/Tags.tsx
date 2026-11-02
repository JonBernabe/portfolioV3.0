type TagsProps = {
  items: readonly string[]
}

export default function Tags({ items }: TagsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded border border-line bg-white/45 px-2 py-1 text-xs text-soft"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
