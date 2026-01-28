export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold text-foreground mb-4">
        403 - Access Denied
      </h1>
      <p className="text-muted-foreground mb-6">
        You do not have permission to access this page.
        <br />
        Only administrators can view the analytics dashboard.
      </p>
      <a
        href="/"
        className="px-6 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Return to Home
      </a>
    </div>
  )
}
