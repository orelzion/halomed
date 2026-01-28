import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
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

  console.log('MIDDLEWARE DEBUG:', {
    path: request.nextUrl.pathname,
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
  })

  // Redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      console.log('MIDDLEWARE: No session, redirecting to /login')
      return NextResponse.redirect(new URL('/login', request.url))
    }
    console.log('MIDDLEWARE: Session exists, allowing access to admin')
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
