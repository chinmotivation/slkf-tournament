import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// Rate-limited routes and their allowed request counts per window.
const RATE_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  '/api/auth/login':    { limit: 10, windowSeconds: 60 },
  '/api/auth/register': { limit: 5,  windowSeconds: 60 },
  '/api/check-in/verify': { limit: 60, windowSeconds: 60 },
  '/api/check-in/mark':   { limit: 60, windowSeconds: 60 },
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting (runs before auth, no DB call needed) ─────────────────────
  const rateLimitKey = Object.keys(RATE_LIMITS).find(p => pathname.startsWith(p))
  if (rateLimitKey) {
    const opts = RATE_LIMITS[rateLimitKey]
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const result = checkRateLimit(`${ip}:${rateLimitKey}`, opts)
    if (!result.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(opts.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
  }

  // ── Supabase session refresh + auth guards ───────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes — no auth required
  const publicPaths = ['/login', '/register', '/unauthorized', '/forgot-password', '/reset-password', '/api/auth']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    if (user && pathname.startsWith('/login')) {
      // Already authenticated — send to role-appropriate dashboard
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = (data as { role: string } | null)?.role
      const dest =
        role === 'head_master'   ? '/head-master/dashboard'
        : role === 'super_admin' ? '/admin/dashboard'
        : role === 'referee'     ? '/referee/dashboard'
        : role === 'student'     ? '/student/dashboard'
        : '/association/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  // All other routes require authentication
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-restricted route guards
  const needsRoleCheck =
    pathname.startsWith('/head-master') ||
    pathname.startsWith('/association') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/referee')

  if (needsRoleCheck) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const profile = data as { role: string } | null

    if (pathname.startsWith('/head-master') && profile?.role !== 'head_master') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (pathname.startsWith('/association') && profile?.role !== 'association_rep') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (pathname.startsWith('/student') && profile?.role !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (pathname.startsWith('/admin') && profile?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (pathname.startsWith('/referee') && profile?.role !== 'referee') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
