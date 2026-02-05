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
    <div
      className={cn('rounded-2xl border overflow-hidden transition-all duration-300', className)}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 transition-transform duration-300"
              style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          {description && (
            <p className="text-sm hidden md:block" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
        </div>
        {summaryValue && (
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>{summaryValue}</span>
            {summaryTrend && (
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{summaryTrend}</span>
            )}
          </div>
        )}
      </button>
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-6 pt-2">{children}</div>
      </div>
    </div>
  )
}
