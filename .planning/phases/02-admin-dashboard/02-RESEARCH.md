# Phase 2: Admin Dashboard - Research

**Researched:** 2026-01-28
**Domain:** Next.js admin dashboard with role-based access control and data visualization
**Confidence:** HIGH

## Summary

This phase builds a web-based admin analytics dashboard on Next.js 16 App Router, displaying engagement metrics from Phase 1's analytics views. The implementation requires three key components: (1) role-based route protection using middleware and server-side session validation, (2) client-side data visualization with Recharts wrapped in Client Components, and (3) RPC calls to Supabase SECURITY DEFINER functions that enforce admin-only access at the database level.

Phase 1 already established the security foundation: `user_roles` table, JWT custom claims via Auth Hook, `is_admin()` helper function, and SECURITY DEFINER wrapper functions for all analytics views. This phase consumes those functions via `supabase.rpc()` calls and presents the data through charts with date range filtering.

**Primary recommendation:** Use Next.js middleware for route-level protection, Server Components for data fetching via Supabase RPC, and Recharts in Client Components for visualization. Implement simple date range filtering with URL query parameters (no complex date picker library needed for MVP's last day/week/month requirement).

## Standard Stack

The established libraries/tools for Next.js admin dashboards with Supabase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.1 (installed) | App Router framework | Industry standard for React SSR/SSG, built-in middleware support |
| Recharts | ^2.15.x | Data visualization | Most popular React charting library (24.8K+ GitHub stars), simple API, built on D3 |
| Supabase JS | 2.90.1 (installed) | Database client | RPC support for PostgreSQL functions, type-safe queries |
| Tailwind CSS | 3.4.19 (installed) | Styling | Already used in project, utility-first CSS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^3.x | Date manipulation | Format dates for display, calculate ranges (lighter than moment.js) |
| React 19 | 19.2.3 (installed) | UI framework | Required for Next.js 16, already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Apache ECharts | More features but heavier bundle, overkill for simple charts |
| Recharts | Chart.js | Lower-level, requires more configuration, less React-friendly |
| date-fns | Day.js | Smaller but less feature-complete, date-fns better TypeScript support |
| Simple select | shadcn/ui date picker | Adds complexity, not needed for 3 preset options |

**Installation:**
```bash
cd web
npm install recharts date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
web/app/admin/
├── analytics/
│   ├── page.tsx              # Server Component - route protection + data fetch
│   ├── _components/          # Client Components (charts)
│   │   ├── SummaryCards.tsx  # KPI cards (total users, completion rate)
│   │   ├── PopularTracksChart.tsx
│   │   ├── StreakDropoffsChart.tsx
│   │   ├── QuizCompletionChart.tsx
│   │   └── DateRangeFilter.tsx
│   └── layout.tsx            # Admin layout wrapper
└── forbidden.tsx             # Custom 403 page (Next.js 16)
```

### Pattern 1: Route Protection with Middleware + Server Component
**What:** Two-layer security: middleware checks auth status, server component validates admin role and fetches data
**When to use:** Always for admin routes

**Example:**
```typescript
// middleware.ts (root level)
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Create Supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

**Source:** [Supabase Next.js SSR docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

```typescript
// app/admin/analytics/page.tsx (Server Component)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { forbidden } from 'next/navigation'
import { SummaryCards } from './_components/SummaryCards'
import { PopularTracksChart } from './_components/PopularTracksChart'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  )

  // Validate admin role by calling RPC function
  // If user is not admin, the function throws EXCEPTION which returns error
  const { data: summaryData, error } = await supabase.rpc('get_summary_stats')

  if (error) {
    if (error.message.includes('Access denied')) {
      forbidden() // Next.js 16 built-in 403 handler
    }
    throw error
  }

  const { data: tracksData } = await supabase.rpc('get_popular_tracks')

  return (
    <div className="p-8">
      <h1>Analytics Dashboard</h1>
      <SummaryCards data={summaryData} />
      <PopularTracksChart data={tracksData} />
    </div>
  )
}
```

**Source:** [Next.js forbidden() function](https://nextjs.org/docs/app/api-reference/functions/forbidden)

### Pattern 2: Client Component for Charts
**What:** Recharts components require `"use client"` directive, fetch happens server-side and data passed as props
**When to use:** All data visualizations in Next.js App Router

**Example:**
```typescript
// app/admin/analytics/_components/PopularTracksChart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Track {
  track_title: string
  total_users: number
  completion_rate_pct: number
}

export function PopularTracksChart({ data }: { data: Track[] }) {
  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="track_title" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total_users" fill="#D4A373" name="Total Users" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**Source:** [Recharts official examples](https://recharts.github.io/en-US/examples/SimpleBarChart/)

### Pattern 3: URL-Based Date Range Filtering
**What:** Store filter state in URL query params, server component reads and passes to client
**When to use:** Dashboard filters that should be shareable/bookmarkable

**Example:**
```typescript
// app/admin/analytics/_components/DateRangeFilter.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function DateRangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRange = searchParams.get('range') || '7d'

  const handleChange = (range: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('range', range)
    router.push(`/admin/analytics?${params.toString()}`)
  }

  return (
    <select
      value={currentRange}
      onChange={(e) => handleChange(e.target.value)}
      className="border rounded px-4 py-2"
    >
      <option value="1d">Last Day</option>
      <option value="7d">Last Week</option>
      <option value="30d">Last Month</option>
    </select>
  )
}
```

**Source:** [Next.js useSearchParams hook](https://nextjs.org/docs/app/api-reference/functions/use-search-params)

### Pattern 4: Manual Refresh with Server Actions
**What:** Server Action to trigger data refetch without full page reload
**When to use:** Manual refresh button for dashboard

**Example:**
```typescript
// app/admin/analytics/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function refreshAnalytics() {
  revalidatePath('/admin/analytics')
}
```

```typescript
// app/admin/analytics/_components/RefreshButton.tsx
'use client'

import { refreshAnalytics } from '../actions'

export function RefreshButton() {
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    await refreshAnalytics()
    setLoading(false)
  }

  return (
    <button onClick={handleRefresh} disabled={loading}>
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  )
}
```

**Source:** [Next.js revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)

### Anti-Patterns to Avoid
- **"use client" at page level:** Blocks server-side data fetching, prevents middleware protection optimization
- **Client-side role checking only:** Never trust client-side checks, always validate on server
- **Direct materialized view access:** Phase 1 revoked direct access, must use `supabase.rpc()` wrapper functions
- **Fixed chart dimensions:** ResponsiveContainer requires parent with explicit height, not "h-full" on self

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT decoding client-side | Custom base64 decoder | `supabase.auth.getUser()` + JWT claim | Supabase handles token refresh, expiry, validation |
| Date range calculations | Manual date math | date-fns `subDays()`, `startOfWeek()` | Handles edge cases (DST, leap years, locale) |
| Chart tooltips | Custom hover state | Recharts `<Tooltip />` | Built-in formatting, positioning, animations |
| Responsive charts | Media queries + multiple renders | Recharts `<ResponsiveContainer />` | Auto-resizes on window change, single render |
| Admin check function | Multiple RPC calls | Existing `is_admin()` wrapper | Phase 1 implemented query plan caching (STABLE) |
| Route protection | Client-side redirects | Next.js middleware + `forbidden()` | Prevents flash of protected content, proper 403 status |

**Key insight:** Next.js 16 App Router and Supabase provide built-in patterns for authentication and RPC. Phase 1 already built the database security layer (SECURITY DEFINER functions), so Phase 2 focuses on UI/presentation.

## Common Pitfalls

### Pitfall 1: Middleware Only Protection (Insufficient Security)
**What goes wrong:** Middleware checks auth but not role, allowing authenticated non-admin users to access page
**Why it happens:** Middleware runs edge runtime which can't easily access database for role lookup
**How to avoid:**
- Middleware checks authentication (session exists)
- Server Component validates admin role via RPC call
- RPC function throws EXCEPTION if not admin (enforced at database level)
**Warning signs:**
- Only checking `session` existence in middleware
- No RPC call validation in server component
- Trusting client-side role claims without server validation

### Pitfall 2: Recharts in Server Components
**What goes wrong:** Build error "You're importing a component that needs useState/useEffect. It only works in a Client Component but none of its parents are marked with 'use client'"
**Why it happens:** Recharts uses React hooks (browser-only), but Server Components run on server
**How to avoid:**
- Add `"use client"` directive at top of chart component files
- Server Component fetches data, passes as props to Client Component
- Keep Client Components as leaves (don't import Server Components into them)
**Warning signs:**
- Import Recharts components in files without `"use client"`
- Trying to fetch data inside Recharts component

### Pitfall 3: ResponsiveContainer Sizing Issues
**What goes wrong:** Chart doesn't render, shows as 0x0, or doesn't resize
**Why it happens:** ResponsiveContainer needs explicit height from parent, CSS `h-full` on self doesn't work
**How to avoid:**
- Parent `<div>` must have explicit height (`h-96`, `h-[400px]`, or flex with `flex-1`)
- Don't use `h-full` on ResponsiveContainer itself
- Test with multiple screen sizes (charts may break on mobile)
**Warning signs:**
- Chart invisible on first load
- Console warning about ResponsiveContainer height
- Chart doesn't resize when window changes

### Pitfall 4: Direct Materialized View Access
**What goes wrong:** RLS policies don't work on materialized views, get cryptic permission denied errors
**Why it happens:** PostgreSQL doesn't support RLS on materialized views, Phase 1 used SECURITY DEFINER wrapper functions instead
**How to avoid:**
- Always call `supabase.rpc('get_popular_tracks')` not `.from('popular_tracks')`
- Wrapper functions handle admin check, materialized view access, and type safety
- Never grant direct SELECT on `analytics.*` tables
**Warning signs:**
- Using `.from('analytics.popular_tracks')`
- Adding RLS policies to materialized views (silently ignored)
- "relation does not exist" errors despite view existing

### Pitfall 5: Stale JWT Claims After Role Change
**What goes wrong:** User promoted to admin but still sees 403, or admin demoted but still has access
**Why it happens:** JWT custom claims cached in token until expiry/refresh
**How to avoid:**
- User must sign out and sign in for role change to take effect
- Document this in admin panel when changing roles
- Consider shorter token expiry in production (Supabase default: 1 hour)
**Warning signs:**
- "I just made them admin but they still can't access"
- Admin access persisting after role removal
- RPC calls succeeding/failing inconsistently

### Pitfall 6: Date Range Not Filtered Server-Side
**What goes wrong:** Fetch all data, filter client-side, slow dashboard with large datasets
**Why it happens:** Phase 1 views have fixed time windows (90 days), but dashboard needs 1d/7d/30d
**How to avoid:**
- Phase 1 views already filter (7d, 30d, 90d depending on view)
- Client-side filter on pre-aggregated data is acceptable for MVP
- For large datasets, add date range parameter to wrapper functions
**Warning signs:**
- Dashboard slow on first load
- Fetching thousands of rows then filtering
- Network tab shows large response payloads

## Code Examples

Verified patterns from official sources:

### Creating Supabase Server Client in App Router
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```
**Source:** [Supabase SSR Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

### Calling SECURITY DEFINER Functions via RPC
```typescript
// Server Component
const { data, error } = await supabase.rpc('get_popular_tracks')

if (error) {
  if (error.message.includes('Access denied')) {
    forbidden() // User not admin
  }
  console.error('RPC error:', error)
  return null
}

// data is typed according to PostgreSQL function return type
```
**Source:** [Supabase RPC Documentation](https://supabase.com/docs/reference/javascript/rpc)

### Recharts Line Chart with Time Series
```typescript
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface WeeklyData {
  week_start: string
  completion_rate_pct: number
}

export function CompletionTrendChart({ data }: { data: WeeklyData[] }) {
  const formattedData = data.map(d => ({
    ...d,
    week: format(new Date(d.week_start), 'MMM dd'),
  }))

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="completion_rate_pct"
            stroke="#D4A373"
            name="Completion Rate (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```
**Source:** [Recharts Line Chart Example](https://recharts.github.io/en-US/examples/SimpleLineChart/)

### Next.js 16 Experimental forbidden() Handler
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true, // Enable forbidden() function
  },
}
```

```typescript
// app/admin/forbidden.tsx (custom 403 page)
export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">403 - Access Denied</h1>
      <p>You do not have permission to access this page.</p>
      <a href="/" className="mt-4 text-blue-500 hover:underline">
        Return to Home
      </a>
    </div>
  )
}
```
**Source:** [Next.js forbidden() Function](https://nextjs.org/docs/app/api-reference/functions/forbidden)

### TypeScript Types for Analytics Data
```typescript
// types/analytics.ts
export interface SummaryStats {
  total_users: number
  active_users_7d: number
  active_users_30d: number
  completion_rate_30d: number
  quiz_completion_rate_30d: number
  review_completion_rate_30d: number
  refreshed_at: string
}

export interface PopularTrack {
  track_id: string
  track_title: string
  total_users: number
  total_completions: number
  total_scheduled: number
  completion_rate_pct: number
}

export interface StreakDropoff {
  days_before_dropoff: number
  num_streaks_ended: number
  percentage: number
}

export interface QuizCompletionRate {
  week_start: string
  users_with_quizzes: number
  total_quizzes: number
  completed_quizzes: number
  completion_rate_pct: number
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth.js | Supabase Auth with JWT hooks | 2024-2025 | Simpler setup, built-in RLS integration |
| Chart.js | Recharts v3 | 2025-2026 | More React-friendly API, better TypeScript |
| Client-side role checks | Database SECURITY DEFINER functions | Phase 1 (2026) | Impossible to bypass, single source of truth |
| Custom date pickers | Simple select for presets | MVP decision | Faster implementation, 90% of use cases |
| middleware.js | middleware.ts (proxy.js in Next.js 16) | Next.js 16 | Filename change only, same functionality |

**Deprecated/outdated:**
- NextAuth.js: Still maintained but Supabase Auth better integrated for Supabase projects
- Chart.js direct usage: Lower-level, requires more boilerplate than Recharts
- RLS policies on materialized views: Never worked, use SECURITY DEFINER wrapper functions

## Open Questions

Things that couldn't be fully resolved:

1. **JWT Refresh on Role Change**
   - What we know: JWT custom claims cached until token expiry (default 1 hour)
   - What's unclear: Best UX for forcing refresh without sign out/in flow
   - Recommendation: Document limitation, implement sign out/in for MVP, consider shorter token TTL

2. **Chart Performance with Large Datasets**
   - What we know: Phase 1 views pre-aggregate and filter (90-day windows)
   - What's unclear: Will client-side rendering 90 days of weekly data be performant?
   - Recommendation: Start with client-side rendering, monitor performance, optimize if needed

3. **Mobile Dashboard Experience**
   - What we know: Recharts responsive, but complex charts hard on mobile
   - What's unclear: Should admin dashboard be mobile-optimized for MVP?
   - Recommendation: Desktop-first MVP, revisit mobile experience post-launch

4. **Date Range Filter Implementation**
   - What we know: Views have fixed windows (7d, 30d, 90d columns or entire dataset)
   - What's unclear: Should date range filter be cosmetic (hide rows) or functional (new queries)?
   - Recommendation: Client-side filtering on pre-fetched data for MVP simplicity

## Sources

### Primary (HIGH confidence)
- [Next.js App Router Authentication](https://nextjs.org/learn/dashboard-app/adding-authentication) - Route protection patterns
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - JWT custom claims implementation
- [Supabase JavaScript RPC](https://supabase.com/docs/reference/javascript/rpc) - Calling PostgreSQL functions
- [Next.js forbidden() Function](https://nextjs.org/docs/app/api-reference/functions/forbidden) - Built-in 403 handling
- [Recharts Official Examples](https://recharts.github.io/en-US/examples/) - Chart implementation patterns
- [Next.js Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - Server vs Client components

### Secondary (MEDIUM confidence)
- [Top React Chart Libraries 2026](https://aglowiditsolutions.com/blog/react-chart-libraries/) - Recharts market position
- [React Admin Dashboard Mistakes](https://dev.to/vaibhavg/common-mistakes-in-react-admin-dashboards-and-how-to-avoid-them-1i70) - Security pitfalls
- [Next.js Server Components Anti-Patterns](https://medium.com/@tiva.nafira/using-design-patterns-and-avoiding-anti-patterns-in-next-js-cea0a601c27e) - Composition patterns
- [Recharts Responsive Design Issues](https://github.com/recharts/recharts/issues/1423) - ResponsiveContainer pitfalls

### Tertiary (LOW confidence)
- [shadcn/ui Date Picker](https://ui.shadcn.com/docs/components/date-picker) - Alternative to simple select, not needed for MVP
- Various Medium articles on Next.js patterns - General guidance, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified versions from package.json, official docs confirm Next.js 16 + Recharts compatibility
- Architecture: HIGH - Patterns from official Next.js and Supabase documentation, Phase 1 database layer verified
- Pitfalls: MEDIUM - ResponsiveContainer and RLS issues from GitHub issues, other pitfalls from community sources
- Security patterns: HIGH - Phase 1 implementation verified in migrations, Supabase official RBAC documentation

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable stack, slow-moving patterns)
