'use client'

import { cn } from '@/lib/utils'

export function KPISkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-lg border border-muted p-6', className)}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-8 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/3" />
      </div>
    </div>
  )
}

export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-lg border border-muted overflow-hidden', className)}>
      <div className="px-6 py-4 border-b border-muted">
        <div className="animate-pulse flex items-center justify-between">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-5 bg-muted rounded w-20" />
        </div>
      </div>
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4 p-3 bg-muted/50 rounded">
          <div className="h-4 bg-muted rounded flex-1" />
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-24" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted/50 rounded-lg p-6', className)}>
      <div className="h-4 bg-muted rounded w-32 mb-4" />
      <div className="h-48 bg-muted rounded" />
    </div>
  )
}
