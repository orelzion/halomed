'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { AnalyticsAlert } from '@/types/analytics'

interface AlertStripProps {
  alerts: AnalyticsAlert[]
  className?: string
  onDismiss?: (id: string) => void
}

function AlertIcon({ type, className }: { type: string; className?: string }) {
  const iconClass = cn('w-5 h-5 flex-shrink-0', className)
  if (type === 'warning') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function AlertStrip({ alerts, className, onDismiss }: AlertStripProps) {
  const { t } = useTranslation('admin')
  const [visibleAlerts, setVisibleAlerts] = useState<AnalyticsAlert[]>(alerts)

  useEffect(() => {
    setVisibleAlerts(alerts)
  }, [alerts])

  useEffect(() => {
    const savedDismissed = localStorage.getItem('dismissed_analytics_alerts')
    if (savedDismissed) {
      const dismissed = JSON.parse(savedDismissed)
      setVisibleAlerts((prev) => prev.filter((a) => !dismissed.includes(a.id)))
    }
  }, [])

  const handleDismiss = (id: string) => {
    const savedDismissed = JSON.parse(
      localStorage.getItem('dismissed_analytics_alerts') || '[]'
    )
    localStorage.setItem(
      'dismissed_analytics_alerts',
      JSON.stringify([...savedDismissed, id])
    )
    setVisibleAlerts((prev) => prev.filter((a) => a.id !== id))
    onDismiss?.(id)
  }

  if (visibleAlerts.length === 0) return null

  const alertStyles = {
    info: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
    error: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
  }

  return (
    <div className={cn('space-y-3', className)}>
      {visibleAlerts.map((alert) => {
        const style = alertStyles[alert.type]
        return (
          <div
            key={alert.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-300 hover:shadow-md',
              style.bg,
              style.border
            )}
          >
            <AlertIcon type={alert.type} className={style.text} />
            <span className={cn('flex-1 text-sm font-medium', style.text)}>{alert.message}</span>
            {alert.value !== undefined && alert.threshold !== undefined && (
              <span className={cn('text-xs px-2 py-1 rounded-lg', style.bg, style.text)}>
                {alert.value} / {alert.threshold}
              </span>
            )}
            <button
              onClick={() => handleDismiss(alert.id)}
              className={cn(
                'p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5',
                style.text
              )}
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
