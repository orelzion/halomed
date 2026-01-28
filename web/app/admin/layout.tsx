import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard | HaLomeid',
  description: 'Analytics dashboard for HaLomeid administrators',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-secondary" dir="ltr">
      <header className="bg-card border-b border-muted px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            HaLomeid Admin
          </h1>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to App
          </a>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
