import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { initializeServer } from './lib/server-init'

// Initialize server-side services (runs once on server start)
try {
  initializeServer()
} catch (error) {
  console.error('Failed to initialize server:', error)
  // Continue running but log the error
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security middleware for Next.js 13+
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  // Note: In development, we allow unsafe-inline for hot reload
  // In production, use nonces or hashes for inline scripts/styles
  const isDev = process.env.NODE_ENV === 'development'
  const csp = [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" // Allow for dev hot reload
      : "script-src 'self'", // Strict in production - use nonces/hashes
    isDev
      ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
      : "style-src 'self' https://fonts.googleapis.com", // Strict in production
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "manifest-src 'self'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxRequests = 100 // requests per window
    
    let record = rateLimitStore.get(ip)
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs }
      rateLimitStore.set(ip, record)
    }
    
    record.count++
    
    // Set rate limit headers
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count).toString())
    response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
    
    if (record.count > maxRequests) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
          }
        }
      )
    }
  }
  
  // Authentication check for protected routes
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/orders',
    '/subscriptions',
    '/admin',
    '/farmer/'
  ]
  
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname === path.replace('/', '') || request.nextUrl.pathname.startsWith(path)
  )
  
  if (isProtectedPath) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      const loginUrl = new URL('/auth/signin', request.url)
      loginUrl.searchParams.set('callbackUrl', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    // Role-based access control
    const pathname = request.nextUrl.pathname
    
    if (pathname.startsWith('/admin') && token.role !== 'ADMIN' && token.role !== 'OPERATIONS') {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    if (pathname.startsWith('/farmer') && token.role !== 'FARMER') {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
  
  // CSRF protection for state-changing requests
  const stateMutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
  if (stateMutatingMethods.includes(request.method) && 
      request.nextUrl.pathname.startsWith('/api/')) {
    
    const csrfToken = request.headers.get('x-csrf-token')
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    
    // Check origin header
    if (origin && host && !origin.includes(host)) {
      return new NextResponse('Forbidden: Invalid origin', { status: 403 })
    }
    
    // In production, implement proper CSRF token validation
    // For now, just check that the header exists
    if (!csrfToken && process.env.NODE_ENV === 'production') {
      return new NextResponse('Forbidden: Missing CSRF token', { status: 403 })
    }
  }
  
  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

// Cleanup function for rate limit store
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Cleanup every 5 minutes