import { createClient } from '@/lib/supabase/server'

export default async function DebugPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  // Try calling the RPC
  const { data: summaryData, error: summaryError } = await supabase.rpc('get_summary_stats')

  // Try checking admin status directly
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user?.id || '')
    .single()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Info</h1>

      <div className="space-y-6">
        <section className="bg-card p-4 rounded-lg border border-muted">
          <h2 className="font-semibold mb-2">Session Info</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify({
            hasSession: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
          }, null, 2)}</pre>
        </section>

        <section className="bg-card p-4 rounded-lg border border-muted">
          <h2 className="font-semibold mb-2">User Metadata</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(user?.user_metadata, null, 2)}</pre>
        </section>

        <section className="bg-card p-4 rounded-lg border border-muted">
          <h2 className="font-semibold mb-2">App Metadata (JWT Claims)</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(user?.app_metadata, null, 2)}</pre>
        </section>

        <section className="bg-card p-4 rounded-lg border border-muted">
          <h2 className="font-semibold mb-2">Role from Database</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify({
            role: roleData?.role,
            error: roleError?.message,
          }, null, 2)}</pre>
        </section>

        <section className="bg-card p-4 rounded-lg border border-muted">
          <h2 className="font-semibold mb-2">RPC get_summary_stats Result</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify({
            hasData: !!summaryData,
            error: summaryError?.message,
            errorCode: summaryError?.code,
          }, null, 2)}</pre>
        </section>
      </div>
    </div>
  )
}
