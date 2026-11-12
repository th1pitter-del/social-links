'use client'

import { BarChart3, Blocks, Lock, Mail, ShieldCheck, Unlock } from 'lucide-react'
import { cn } from 'cn'

import { useRotator } from '@/components/home/use-rotator'

type Copy = { title: string; body: string }
type FeatureKey = 'actions' | 'delivery' | 'analytics' | 'email' | 'abuse'

const ORDER: FeatureKey[] = ['analytics', 'delivery', 'actions', 'email', 'abuse']

const ICONS: Record<FeatureKey, typeof BarChart3> = {
  analytics: BarChart3,
  delivery: Lock,
  actions: Blocks,
  email: Mail,
  abuse: ShieldCheck,
}

/**
 * The feature set as a previewer rather than five matching cards: the list on the
 * left is the index, and the single frame on the right shows what the selected
 * feature actually looks like. Selection follows the pointer and the keyboard,
 * and the unattended walk advances it a few seconds at a time.
 */
export function FeatureSwitcher({
  features,
  funnel,
  sampleContent,
  actions,
  emailPlaceholder,
  submitEmail,
  demoTag,
}: {
  features: Record<FeatureKey, Copy>
  funnel: { views: string; unlocks: string; completed: string }
  sampleContent: string
  actions: string[]
  emailPlaceholder: string
  submitEmail: string
  demoTag: string
}) {
  const rotator = useRotator(ORDER.length, 5200)
  const activeKey = ORDER[rotator.active]

  /* This project's react-hooks/refs rule reads the callback ref and the handlers
     as ref values because they travel on the same object, and reports every
     property access on it while rendering. Nothing here touches `ref.current`;
     the exception is scoped to the element that wires the rotator up. */
  /* eslint-disable react-hooks/refs */
  return (
    <div
      ref={rotator.setNode}
      onPointerEnter={rotator.pause}
      onPointerLeave={rotator.resume}
      onFocusCapture={rotator.pause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) rotator.resume()
      }}
      className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8"
    >
      <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1.5">
        {ORDER.map((key, index) => {
          const feature = features[key]
          const Icon = ICONS[key]
          const active = key === activeKey
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`feature-tab-${key}`}
              aria-selected={active}
              aria-controls="feature-preview"
              onPointerEnter={() => rotator.goTo(index)}
              onFocus={() => rotator.goTo(index)}
              onClick={() => rotator.goTo(index)}
              className={cn(
                'group relative flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-start transition-[background-color,border-color] duration-300 motion-reduce:transition-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                active
                  ? 'border-primary/35 bg-card'
                  : 'border-transparent hover:border-border hover:bg-card/60',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-3 start-0 w-0.5 rounded-full bg-primary transition-opacity duration-300',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span
                className={cn(
                  'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1 transition-colors duration-300',
                  active
                    ? 'bg-primary/12 text-accent-text ring-primary/25'
                    : 'bg-muted/60 text-muted-foreground ring-border group-hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium transition-colors duration-300',
                    active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                >
                  {feature.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {feature.body}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div
        id="feature-preview"
        role="tabpanel"
        aria-labelledby={`feature-tab-${activeKey}`}
        className="group/preview relative overflow-hidden rounded-2xl border bg-card"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_90%_0%,rgba(201,247,42,0.15),transparent)] dark:bg-[radial-gradient(60%_60%_at_90%_0%,rgba(213,255,47,0.11),transparent)]"
        />
        <div className="relative flex min-h-[17rem] flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {demoTag}
          </div>

          <div
            key={activeKey}
            className="mt-4 flex flex-1 flex-col justify-center motion-safe:animate-[demo-fade_0.3s_ease-out]"
          >
            <div className="flex h-full flex-1 flex-col justify-center rounded-xl border bg-background/50 p-4">
              <Preview
                feature={activeKey}
                funnel={funnel}
                sampleContent={sampleContent}
                actions={actions}
                emailPlaceholder={emailPlaceholder}
                submitEmail={submitEmail}
                demoTag={demoTag}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  /* eslint-enable react-hooks/refs */
}

function Preview({
  feature,
  funnel,
  sampleContent,
  actions,
  emailPlaceholder,
  submitEmail,
  demoTag,
}: {
  feature: FeatureKey
  funnel: { views: string; unlocks: string; completed: string }
  sampleContent: string
  actions: string[]
  emailPlaceholder: string
  submitEmail: string
  demoTag: string
}) {
  if (feature === 'analytics') {
    const stages = [
      { label: funnel.views, width: '100%', tone: 'bg-chart-1/70' },
      { label: funnel.unlocks, width: '68%', tone: 'bg-chart-1/45' },
      { label: funnel.completed, width: '41%', tone: 'bg-chart-1/25' },
    ]
    return (
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[0.7rem] text-muted-foreground">
              {stage.label}
            </span>
            <span className="h-6 flex-1 overflow-hidden rounded-md bg-muted/60">
              <span
                className={cn('block h-full rounded-md', stage.tone)}
                style={{ width: stage.width }}
              />
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (feature === 'delivery') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[0.7rem] font-medium text-muted-foreground">
          <span className="relative size-4">
            <Lock className="absolute inset-0 size-4 transition-opacity duration-300 group-hover/preview:opacity-0 no-hover:opacity-0" />
            <Unlock className="absolute inset-0 size-4 opacity-0 transition-opacity duration-300 group-hover/preview:opacity-100 no-hover:opacity-100" />
          </span>
          {demoTag}
        </div>
        <div className="space-y-2 transition-[opacity,filter] duration-500 group-hover/preview:blur-none no-hover:blur-none">
          <p className="text-sm leading-relaxed blur-[5px] group-hover/preview:blur-none no-hover:blur-none">
            {sampleContent}
          </p>
          <span
            aria-hidden
            className="block h-2 w-3/4 rounded-full bg-foreground/15 blur-[4px] group-hover/preview:blur-none no-hover:blur-none"
          />
          <span
            aria-hidden
            className="block h-2 w-1/2 rounded-full bg-foreground/10 blur-[4px] group-hover/preview:blur-none no-hover:blur-none"
          />
        </div>
      </div>
    )
  }

  if (feature === 'actions') {
    return (
      <ul className="flex flex-wrap justify-center gap-2.5">
        {actions.map((label, index) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-sm motion-safe:animate-[demo-fade_0.35s_ease-out_both]"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {label}
          </li>
        ))}
      </ul>
    )
  }

  if (feature === 'email') {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5">
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm text-muted-foreground">{emailPlaceholder}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex size-4 items-center justify-center rounded-[0.3rem] border bg-primary">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="size-3 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span className="text-xs text-muted-foreground">{submitEmail}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-16 items-center gap-1" aria-hidden>
      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-10 flex-1 rounded-[3px]',
            index < 19 ? 'bg-primary/70' : index < 22 ? 'bg-warning/70' : 'bg-muted',
          )}
        />
      ))}
    </div>
  )
}
