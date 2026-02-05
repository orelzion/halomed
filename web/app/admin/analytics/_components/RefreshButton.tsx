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

      await supabase.rpc('manual_refresh')

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
      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
    >
      {isRefreshing ? 'מרענן...' : 'רענן'}
    </button>
  )
}
