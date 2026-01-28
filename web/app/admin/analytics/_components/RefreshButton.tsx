'use client'

interface Props {
  onRefresh?: () => void | Promise<void>
}

export function RefreshButton({ onRefresh }: Props) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    } else {
      // Default: reload the page
      window.location.reload()
    }
  }

  return (
    <button
      onClick={handleRefresh}
      className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
    >
      Refresh
    </button>
  )
}
