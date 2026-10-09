function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

// ─── Single source of truth for horizontal alignment ───
// Header, footer, and all pages must use this. No more
// ad-hoc `px-4` / `max-w-6xl` / `sm:px-6` drift.
//
// Usage:
//   <Container>            -> max-w-7xl (storefront default)
//   <Container size="narrow"> -> max-w-3xl (cart, checkout forms)
//   <Section>              -> vertical rhythm wrapper

const SIZES = {
  narrow: 'max-w-3xl', // cart, order lookup, confirmation
  form: 'max-w-5xl', // checkout, settings
  content: 'max-w-6xl', // dashboard, white break section
  wide: 'max-w-7xl', // storefront, catalog, header/footer
  hero: 'max-w-4xl', // centered hero copy
};

export function Container({ size = 'wide', className, children, ...rest }) {
  return (
    <div
      className={cn('mx-auto w-full px-4 lg:px-8', SIZES[size] || SIZES.wide, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

const PADS = {
  sm: 'py-10',
  md: 'py-16 sm:py-20',
  lg: 'py-20 sm:py-24',
  hero: 'py-20 sm:py-28 md:py-36',
};

export function Section({ pad = 'lg', className, children, ...rest }) {
  return (
    <section className={cn('relative w-full', PADS[pad] || PADS.lg, className)} {...rest}>
      {children}
    </section>
  );
}

// Centered eyebrow + title + sub — same block everywhere,
// just flip `theme` for dark vs. Vercel-white sections.
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  theme = 'dark',
  className,
}) {
  const light = theme === 'light';
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center flex flex-col items-center',
        className
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold shadow-sm mb-5',
            light
              ? 'border-[#eaeaea] bg-[#fafafa] text-[#666]'
              : 'border-silver-800/80 bg-glass-light text-silver-300'
          )}
        >
          {eyebrow}
        </div>
      )}
      {title && (
        <h2
          className={cn(
            'font-display font-bold tracking-[-0.02em] leading-[1.1] text-3xl sm:text-4xl md:text-5xl',
            light ? 'text-black' : 'text-silver-gradient'
          )}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={cn('mt-4 text-sm sm:text-[15px] leading-relaxed', light ? 'text-[#666]' : 'text-muted')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
