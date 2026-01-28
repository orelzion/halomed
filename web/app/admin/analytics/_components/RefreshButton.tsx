'use client'

import { useState, useTransition } from 'react'
import { refreshAnalytics } from '../actions'

export function RefreshButton() {
  const [isPending, startTransition] = useTransition()

  const handleRefresh = () => {
    startTransition(async () => {
      await refreshAnalytics()
    })
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isPending}
      className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Refreshing...' : 'Refresh'}
    </button>
  )
}
