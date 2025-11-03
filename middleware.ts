import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production' })
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/admin') || 
      pathname.startsWith('/farmer') || 
      pathname.startsWith('/customer')) {
    
    if (!token) {
      const url = new URL('/auth/signin', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Role-based access control
    const role = token.role as string

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/farmer') && role !== 'FARMER') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/customer') && role !== 'CUSTOMER') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/farmer/:path*',
    '/customer/:path*',
  ],
}
