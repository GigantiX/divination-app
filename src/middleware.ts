import { auth } from '@/auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const session = await auth()
    const { pathname } = request.nextUrl

    // Protected routes - require authentication
    const protectedPaths = ['/dashboard', '/events', '/people', '/settings', '/admin']
    const isProtectedPath = protectedPaths.some((path) =>
        pathname.startsWith(path)
    )

    // Auth routes - only for unauthenticated users
    const authPaths = ['/login', '/register']
    const isAuthPath = authPaths.some((path) => pathname === path)

    // Redirect unauthenticated users from protected routes
    if (!session && isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect authenticated users from auth routes
    if (session && isAuthPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (Auth.js API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
