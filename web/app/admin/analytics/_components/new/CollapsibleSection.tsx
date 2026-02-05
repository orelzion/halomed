'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface CollapsibleSectionProps {
  title: string
  description?: string
  summaryValue?: string
  summaryTrend?: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  onToggle?: (isOpen: boolean) => void
}

export function CollapsibleSection({
  title,
  description,
  summaryValue,
  summaryTrend,
  children,
  defaultOpen = false,
  className,
  onToggle,
}: CollapsibleSectionProps) {
  const { t } = useTranslation('admin')
  const [isOpen, setIsOpen] = useState(defaultOpen)

  useEffect(() => {
    const savedState = localStorage.getItem(`analytics_section_${title}`)
    if (savedState !== null) {
      setIsOpen(JSON.parse(savedState))
    }
  }, [title])

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    localStorage.setItem(`analytics_section_${title}`, JSON.stringify(newState))
    onToggle?.(newState)
  }

  return (
    <div className={cn('bg-card rounded-lg border border-muted overflow-hidden', className)}>
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground hidden md:block">
              {description}
            </p>
          )}
        </div>
        {summaryValue && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{summaryValue}</span>
            {summaryTrend && (
              <span className="text-muted-foreground">{summaryTrend}</span>
            )}
          </div>
        )}
      </button>
      <div
        className={cn(
          'transition-all duration-200 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>
  )
}
