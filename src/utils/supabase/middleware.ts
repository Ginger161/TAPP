import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const redirectWithCookies = (targetPath: string) => {
    const url = request.nextUrl.clone()
    url.pathname = targetPath
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  if (!user && !pathname.startsWith('/login')) {
    return redirectWithCookies('/login')
  }

  if (user) {
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Middleware fetch user role error:', error)
    }

    const role = userRecord?.role || 'unknown'
    let targetDashboard = '/login'
    if (role === 'manager') targetDashboard = '/manager/dashboard'
    else if (role === 'admin') targetDashboard = '/admin/dashboard'
    else if (role === 'viewer') targetDashboard = '/viewer/dashboard'

    // Root / Generic Dispatcher
    if (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/login')) {
      if (role !== 'unknown') {
        return redirectWithCookies(targetDashboard)
      }
    }

    // Strict Route Protection
    if (pathname.startsWith('/admin') && role !== 'admin') {
      if (pathname !== targetDashboard) return redirectWithCookies(targetDashboard)
    }

    if (pathname.startsWith('/manager') && role !== 'manager') {
      if (pathname !== targetDashboard) return redirectWithCookies(targetDashboard)
    }

    if (pathname.startsWith('/viewer') && role !== 'viewer') {
      if (pathname !== targetDashboard) return redirectWithCookies(targetDashboard)
    }
  }

  return supabaseResponse
}
