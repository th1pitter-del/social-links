import { Blocks, BarChart3, Lock, Mail, ShieldCheck, Unlock } from 'lucide-react'
import { cn } from 'cn'

type Copy = { title: string; body: string }

/**
 * The feature set as one composition instead of five matching cards. Each tile is
 * shaped by what it claims: the analytics tile draws the funnel it describes, the
 * delivery tile hides its own text behind a blur until you hover it, the abuse
 * tile carries a rate meter.
 *
 * Interactions are CSS-only here: no JavaScript reaches the browser for this
 * section, and every hover-only state is already visible on touch devices through
 * the `no-hover` variant.
 */
export function FeatureBento({
  features,
  funnel,
  sampleContent,
  actions,
  emailPlaceholder,
  submitEmail,
  demoLabel,
  demoTag,
}: {
  features: Record<'actions' | 'delivery' | 'analytics' | 'email' | 'abuse', Copy>
  /** Funnel stage names; the widths are an illustrative shape, never invented numbers. */
  funnel: { views: string; unlocks: string; completed: string }
  sampleContent: string
  actions: string[]
  emailPlaceholder: string
  submitEmail: string
  demoLabel: string
  /** Short honesty tag repeated under the drawn mocks; the long label is for the card mock only. */
  demoTag: string
}) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <AnalyticsTile copy={features.analytics} funnel={funnel} demoTag={demoTag} />

      <Tile
        className="lg:col-span-2"
        icon={<Lock className="size-5" />}
        title={features.delivery.title}
        body={features.delivery.body}
      >
        <div className="mt-4 rounded-xl border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-[0.7rem] font-medium text-muted-foreground">
            {/* The two glyphs cross-fade with the blur clearing, so the hover
                reads as the lock opening rather than as a colour change. */}
            <span className="relative size-4">
              <Lock className="absolute inset-0 size-4 transition-opacity duration-300 group-hover:opacity-0 no-hover:opacity-0" />
              <Unlock className="absolute inset-0 size-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 no-hover:opacity-100" />
            </span>
            {demoLabel}
          </div>
          <p className="mt-2 text-xs leading-relaxed opacity-60 blur-[5px] transition-[opacity,filter] duration-500 group-hover:opacity-100 group-hover:blur-none no-hover:opacity-100 no-hover:blur-none">
            {sampleContent}
          </p>
        </div>
      </Tile>

      <Tile
        className="lg:col-span-2"
        icon={<Blocks className="size-5" />}
        title={features.actions.title}
        body={features.actions.body}
      >
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {actions.map((label, index) => (
            <li
              key={label}
              className={cn(
                'rounded-full border bg-muted/40 px-2.5 py-1 text-[0.7rem] text-muted-foreground',
                'motion-safe:animate-[demo-chip_9s_ease-in-out_infinite] motion-reduce:opacity-100',
              )}
              style={{ animationDelay: `${index * 1.4}s` }}
            >
              {label}
            </li>
          ))}
        </ul>
      </Tile>

      <Tile
        className="lg:col-span-2"
        icon={<Mail className="size-5" />}
        title={features.email.title}
        body={features.email.body}
      >
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5">
            <Mail className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-[0.7rem] text-muted-foreground">
              {emailPlaceholder}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-[0.3rem] border bg-background transition-colors duration-300 group-hover:border-primary group-hover:bg-primary no-hover:border-primary no-hover:bg-primary">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="size-3 scale-50 text-primary-foreground opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-100 group-hover:opacity-100 no-hover:scale-100 no-hover:opacity-100"
                fill="none"
                stroke="currentColor"
                strokeWidth={3.5}
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span className="rounded-md bg-primary px-2 py-1 text-[0.65rem] font-medium text-primary-foreground opacity-60 transition-opacity duration-300 group-hover:opacity-100 no-hover:opacity-100">
              {submitEmail}
            </span>
          </div>
        </div>
      </Tile>

      <Tile
        className="lg:col-span-2"
        icon={<ShieldCheck className="size-5" />}
        title={features.abuse.title}
        body={features.abuse.body}
      >
        <div className="mt-4 space-y-2">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <span className="w-[45%] bg-primary transition-[width] duration-700 ease-out group-hover:w-[72%] no-hover:w-[72%]" />
            <span className="w-[10%] bg-warning/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100 no-hover:opacity-100" />
          </div>
          <MockTag label={demoTag} />
        </div>
      </Tile>
    </div>
  )
}

function AnalyticsTile({
  copy,
  funnel,
  demoTag,
}: {
  copy: Copy
  funnel: { views: string; unlocks: string; completed: string }
  demoTag: string
}) {
  const stages = [
    { label: funnel.views, idle: '100%', full: '100%', tone: 'bg-chart-1/70' },
    { label: funnel.unlocks, idle: '46%', full: '68%', tone: 'bg-chart-1/45' },
    { label: funnel.completed, idle: '22%', full: '41%', tone: 'bg-chart-1/25' },
  ]

  return (
    <Tile
      className="sm:col-span-2 lg:col-span-4"
      icon={<BarChart3 className="size-5" />}
      title={copy.title}
      body={copy.body}
    >
      <div className="mt-5 space-y-2.5">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[0.7rem] text-muted-foreground">
              {stage.label}
            </span>
            <span className="h-5 flex-1 overflow-hidden rounded-md bg-muted/60">
              {/* Hovering the tile draws the funnel further: the shape is the
                  product's real path (views, then starts, then completions), and
                  only its proportions are illustrative - no figures are invented.
                  Widths come from custom properties because an inline width would
                  outrank the hover utility and freeze the bar. */}
              <span
                className={cn(
                  'block h-full w-[var(--idle)] rounded-md transition-[width] duration-700 ease-out',
                  'group-hover:w-[var(--full)] no-hover:w-[var(--full)]',
                  stage.tone,
                )}
                style={
                  { '--idle': stage.idle, '--full': stage.full } as React.CSSProperties
                }
              />
            </span>
          </div>
        ))}
        <MockTag label={demoTag} />
      </div>
    </Tile>
  )
}

/**
 * Every drawn mock says what it is. Short on purpose: the same sentence repeated
 * under five tiles reads as noise, and the honesty it buys is one word.
 */
function MockTag({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
      <span aria-hidden className="size-1 shrink-0 rounded-full bg-muted-foreground/60" />
      {label}
    </p>
  )
}

function Tile({
  icon,
  title,
  body,
  children,
  className,
}: {
  icon: React.ReactNode
  title: string
  body: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-2xl border bg-card p-5 transition-[border-color,box-shadow,transform] duration-300',
        'hover:border-primary/40 motion-safe:hover:-translate-y-0.5',
        className,
      )}
    >
      <TileCopy icon={icon} title={title} body={body} />
      {/* The mock is pushed to the bottom edge, so tiles that share a row end
          their artwork level no matter how long the copy turns out to be in a
          given language. */}
      <div className="mt-auto">{children}</div>
    </article>
  )
}

function TileCopy({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <>
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-accent-text ring-1 ring-primary/20">
        {icon}
      </span>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </>
  )
}
