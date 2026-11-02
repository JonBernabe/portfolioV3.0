const VARIANTS = {
  heading:
    'mt-1.5 mb-4 font-display text-[30px]/[1.1] font-bold md:text-[34px]/[1.1]',
  label:
    'mt-[22px] mb-2.5 font-display text-xs font-bold tracking-[.12em] text-dim',
  body: 'mb-3 text-[15px]/[1.6] text-soft',
  cardTitle: 'mb-1.5 font-display text-[19px] font-bold',
  cardBody: 'mb-2.5 text-sm/[1.6] text-soft',
}

export type TextProps = {
    children: React.ReactNode;
    className?: string;
    as?: React.ElementType;
    variant?: keyof typeof VARIANTS;
}

export default function Text({
  children,
  className = '',
  as: Component = 'p',
  variant,
}: TextProps) {
  const variantClasses = variant ? VARIANTS[variant] : ''

  return (
    <Component className={`${variantClasses} ${className}`.trim()}>
      {children}
    </Component>
  )
}
