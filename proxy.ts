import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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
  const { pathname } = request.nextUrl

  // Public routes — no auth required
  const publicPaths = ['/login', '/register', '/unauthorized', '/forgot-password', '/reset-password', '/api/auth']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    if (user && pathname.startsWith('/login')) {
      // Already authenticated — send to role-appropriate dashboard
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = (data as { role: string } | null)?.role
      const dest = role === 'head_master' ? '/head-master/dashboard' : '/association/dashboard'
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

  // Role-restricted route guards — single DB query covers both cases
  const needsRoleCheck = pathname.startsWith('/head-master') || pathname.startsWith('/association') || pathname.startsWith('/student')
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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
