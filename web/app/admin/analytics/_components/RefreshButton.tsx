'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Props {
  onRefresh?: () => void | Promise<void>
}

export function RefreshButton({ onRefresh }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
      return
    }

    try {
      setIsRefreshing(true)

      // Call the manual refresh RPC function to update materialized views
      await supabase.rpc('manual_refresh')

      // Reload the page to fetch fresh data
      window.location.reload()
    } catch (error) {
      console.error('Error refreshing analytics:', error)
      setIsRefreshing(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  )
}
