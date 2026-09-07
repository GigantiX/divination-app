import { auth } from '@/auth'
import { NextResponse, type NextRequest } from 'next/server'

// Keep the legacy filename while OpenNext lacks support for Next 16's Node.js Proxy output.
export async function middleware(request: NextRequest) {
    const session = await auth()
    const { pathname } = request.nextUrl

    const protectedPaths = ['/dashboard', '/events', '/people', '/settings', '/admin', '/apps']
    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

    const authPaths = ['/login', '/register']
    const isAuthPath = authPaths.some((path) => pathname === path)

    if (!session && isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (session && isAuthPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
