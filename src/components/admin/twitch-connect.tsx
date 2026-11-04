'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Tv } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  connectTwitchAccount,
  disconnectTwitchAccount,
} from '@/lib/actions/admin-twitch'

export type TwitchConnectState = {
  connectedAs: string | null
  hasClient: boolean
  hasSecret: boolean
  redirectUri: string
  outcome: string | null
}

/**
 * The one credential this app cannot accept as a paste. Twitch answers the
 * follow check only with the channel owner's own approval, so the panel starts
 * a consent round-trip and keeps the resulting tokens by itself.
 */
export function TwitchConnect({
  connectedAs,
  hasClient,
  hasSecret,
  redirectUri,
  outcome,
}: TwitchConnectState) {
  const t = useTranslations('admin.settings.twitch')
  const [pending, setPending] = useState(false)
  const [, startTransition] = useTransition()

  function connect() {
    setPending(true)
    startTransition(async () => {
      const result = await connectTwitchAccount()
      setPending(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      window.location.assign(result.url)
    })
  }

  function disconnect() {
    startTransition(async () => {
      await disconnectTwitchAccount()
      toast.success(t('disconnectedToast'))
    })
  }

  const ready = hasClient && hasSecret

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Tv className="size-4" />
          </span>
          <p className="text-sm font-medium">{t('title')}</p>
          <Badge variant={connectedAs ? 'secondary' : 'outline'}>
            {connectedAs ? t('connectedAs', { login: connectedAs }) : t('notConnected')}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">{t('help')}</p>

        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('redirectLabel')}
          </p>
          <Input
            readOnly
            value={redirectUri}
            onFocus={(event) => event.target.select()}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">{t('redirectHelp')}</p>
        </div>

        {!ready && connectedAs === null ? (
          <p className="text-xs text-destructive">{t('needClient')}</p>
        ) : null}

        {outcome && outcome !== 'connected' ? (
          <p className="text-xs text-destructive">
            {outcome === 'denied' ? t('deniedNote') : t('failedNote')}
          </p>
        ) : null}
        {outcome === 'connected' ? (
          <p className="text-xs text-primary">{t('connectedNote')}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={connect} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Tv />}
            {connectedAs ? t('reconnect') : t('connect')}
          </Button>
          {connectedAs ? (
            <Button size="sm" variant="outline" onClick={disconnect} disabled={pending}>
              {t('disconnect')}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
