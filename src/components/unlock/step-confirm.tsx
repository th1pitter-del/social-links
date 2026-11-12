'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PlatformGlyph } from '@/components/brand-icon'
import {
  beginTelegramCheckin,
  pollTelegramStep,
  type StepVerificationView,
  type UnlockState,
} from '@/lib/actions/unlock'

const CHECKIN_POLLS = 30
const CHECKIN_EVERY_MS = 10000

export function StepConfirm({ token, actionId, verification, platformLabel, disabled, onState }: {
  token: string
  actionId: string
  verification: StepVerificationView
  platformLabel: string
  disabled: boolean
  onState: (state: UnlockState) => void
}) {
  const t = useTranslations('unlock')
  const [pending, setPending] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  async function checkIn() {
    if (pending || waiting) return
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    setPending(true)
    setError(null)
    try {
      const result = await beginTelegramCheckin({ token, actionId })
      if (!mounted.current) { tab?.close(); return }
      if (!result.ok) { tab?.close(); setError(result.error); return }
      if (tab) tab.location.replace(result.url)
      else window.location.assign(result.url)
      setWaiting(true)
      let attempts = 0
      const poll = async () => {
        attempts += 1
        try {
          const polled = await pollTelegramStep({ token, actionId })
          if (!mounted.current) return
          if (!polled.ok) { setError(polled.error); setWaiting(false); return }
          onState(polled.state)
          if (polled.done || attempts >= CHECKIN_POLLS) { setWaiting(false); return }
          timerRef.current = window.setTimeout(() => void poll(), CHECKIN_EVERY_MS)
        } catch {
          if (mounted.current) { setError(t('verifyUnavailable')); setWaiting(false) }
        }
      }
      timerRef.current = window.setTimeout(() => void poll(), CHECKIN_EVERY_MS)
    } catch {
      tab?.close()
      if (mounted.current) setError(t('verifyUnavailable'))
    } finally {
      if (mounted.current) setPending(false)
    }
  }

  const busy = pending || waiting || disabled
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs text-primary">
        {verification.mode === 'OAUTH'
          ? t('verifyConnectHint', { platform: platformLabel })
          : t('verifyCheckinHint', { platform: platformLabel })}
      </p>
      {verification.mode === 'OAUTH' ? (
        busy ? (
          <Button size="sm" variant="outline" className="mt-2 w-full" disabled>
            {t('verifyConnectButton', { platform: platformLabel })}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="mt-2 w-full bg-background" asChild>
            <a href={verification.connectUrl ?? undefined}>
              <PlatformGlyph platform={verification.platformKey} icon="link" className="size-4" />
              {t('verifyConnectButton', { platform: platformLabel })}
            </a>
          </Button>
        )
      ) : (
        <Button type="button" size="sm" variant="outline" className="mt-2 w-full bg-background"
          disabled={busy} onClick={() => void checkIn()}>
          {pending || waiting ? <Loader2 className="animate-spin" /> : <Send />}
          {waiting ? t('verifyCheckinWaiting') : t('verifyCheckinButton')}
        </Button>
      )}
      {error ? <p role="alert" className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
