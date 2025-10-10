// Security utilities and data protection measures

import crypto from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'
// Mock rate limiting for development - install express-rate-limit and express-slow-down for production
// import rateLimit from 'express-rate-limit'
// import slowDown from 'express-slow-down'

const mockRateLimit = (options: any) => (req: any, res: any, next: any) => {
  // console.log('Mock rate limit:', options);
  next();
};

const mockSlowDown = (options: any) => (req: any, res: any, next: any) => {
  // console.log('Mock slow down:', options);
  next();
};

const rateLimit = mockRateLimit;
const slowDown = mockSlowDown;

// Input sanitization utilities
export class InputSanitizer {
  // Remove HTML tags and potentially dangerous characters
  static sanitizeHtml(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
  }

  // Sanitize SQL input to prevent injection
  static sanitizeSql(input: string): string {
    return input
      .replace(/['";\\]/g, '') // Remove dangerous SQL characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments start
      .replace(/\*\//g, '') // Remove SQL block comments end
      .trim()
  }

  // Sanitize file names
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\./, '') // Remove leading dot
      .substring(0, 255) // Limit length
  }

  // Sanitize email addresses
  static sanitizeEmail(email: string): string {
    return email
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9@._-]/g, '') // Only allow valid email characters
  }

  // Sanitize phone numbers
  static sanitizePhone(phone: string): string {
    return phone
      .replace(/[^0-9+()-\s]/g, '') // Only allow valid phone characters
      .trim()
  }

  // General input sanitization
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeHtml(input)
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item))
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value)
      }
      return sanitized
    }
    
    return input
  }
}

// XSS Protection utilities
export class XSSProtection {
  // Encode HTML entities to prevent XSS
  static encodeHtml(input: string): string {
    const entityMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    }
    
    return input.replace(/[&<>"'`=\/]/g, (char) => entityMap[char])
  }

  // Decode HTML entities
  static decodeHtml(input: string): string {
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '='
    }
    
    return input.replace(/&[#\w]+;/g, (entity) => entityMap[entity] || entity)
  }

  // Validate and sanitize URLs
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return ''
      }
      
      return parsed.toString()
    } catch {
      return ''
    }
  }

  // Content Security Policy headers
  static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-* should be removed in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
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
  }
}

// CSRF Protection
export class CSRFProtection {
  private static readonly SECRET_KEY = process.env.CSRF_SECRET || 'default-csrf-secret'

  // Generate CSRF token
  static generateToken(sessionId: string): string {
    const timestamp = Date.now().toString()
    const data = `${sessionId}:${timestamp}`
    const signature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(data)
      .digest('hex')
    
    return Buffer.from(`${data}:${signature}`).toString('base64')
  }

  // Verify CSRF token
  static verifyToken(token: string, sessionId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [receivedSessionId, timestamp, signature] = decoded.split(':')
      
      if (receivedSessionId !== sessionId) {
        return false
      }
      
      // Check if token is not too old (1 hour)
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > 60 * 60 * 1000) {
        return false
      }
      
      // Verify signature
      const data = `${receivedSessionId}:${timestamp}`
      const expectedSignature = crypto
        .createHmac('sha256', this.SECRET_KEY)
        .update(data)
        .digest('hex')
      
      return signature === expectedSignature
    } catch {
      return false
    }
  }

  // Middleware for CSRF protection
  static middleware(req: NextApiRequest, res: NextApiResponse, next: Function) {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
      return next()
    }

    const token = req.headers['x-csrf-token'] as string
    const sessionId = req.headers['x-session-id'] as string || 'anonymous'

    if (!token || !this.verifyToken(token, sessionId)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      })
    }

    next()
  }
}

// Rate limiting utilities
export class RateLimiter {
  private static stores = new Map<string, Map<string, { count: number; resetTime: number }>>()

  // Create rate limiter for API endpoints
  static createLimiter(options: {
    windowMs: number
    maxRequests: number
    keyGenerator?: (req: NextApiRequest) => string
  }) {
    const { windowMs, maxRequests, keyGenerator = (req) => (req as any).ip || req.headers['x-forwarded-for'] || 'unknown' } = options
    const storeName = `${windowMs}-${maxRequests}`
    
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map())
    }
    
    const store = this.stores.get(storeName)!

    return (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      const key = keyGenerator(req)
      const now = Date.now()
      
      let record = store.get(key)
      
      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + windowMs }
        store.set(key, record)
      }
      
      record.count++
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count))
      res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
      
      if (record.count > maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        })
      }
      
      next()
    }
  }

  // Cleanup old records
  static cleanup() {
    const now = Date.now()
    
    for (const store of Array.from(this.stores.values())) {
      for (const [key, record] of Array.from(store.entries())) {
        if (now > record.resetTime) {
          store.delete(key)
        }
      }
    }
  }
}

// Data encryption utilities
export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY = crypto.scryptSync(
    process.env.ENCRYPTION_KEY || 'default-encryption-key',
    'salt',
    32
  )

  // Encrypt sensitive data
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(this.ALGORITHM, this.KEY)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  // Decrypt sensitive data
  static decrypt(encryptedText: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
      
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      
      const decipher = crypto.createDecipher(this.ALGORITHM, this.KEY)
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch {
      throw new Error('Failed to decrypt data')
    }
  }

  // Hash passwords securely
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex')
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err)
        resolve(`${salt}:${derivedKey.toString('hex')}`)
      })
    })
  }

  // Verify password hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [salt, key] = hash.split(':')
      
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
          if (err) reject(err)
          resolve(key === derivedKey.toString('hex'))
        })
      })
    } catch {
      return false
    }
  }

  // Generate secure random tokens
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }
}

// File upload security
export class FileUploadSecurity {
  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  // Validate file type
  static validateFileType(mimeType: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(mimeType)
  }

  // Validate file size
  static validateFileSize(size: number): boolean {
    return size <= this.MAX_FILE_SIZE
  }

  // Scan file for malware (mock implementation)
  static async scanFile(buffer: Buffer): Promise<boolean> {
    // In production, integrate with actual antivirus service
    // For now, just check for suspicious patterns
    const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length))
    
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i
    ]
    
    return !suspiciousPatterns.some(pattern => pattern.test(content))
  }

  // Generate safe file name
  static generateSafeFileName(originalName: string): string {
    const ext = originalName.split('.').pop()?.toLowerCase() || ''
    const baseName = crypto.randomBytes(16).toString('hex')
    return `${baseName}.${ext}`
  }
}

// Security headers middleware
export function securityHeaders(req: NextApiRequest, res: NextApiResponse, next: Function) {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', XSSProtection.getCSPHeader())
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  next()
}

// Audit logging
export class AuditLogger {
  static log(event: {
    userId?: string
    action: string
    resource: string
    details?: any
    ip?: string
    userAgent?: string
  }) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event
    }
    
    // In production, send to secure logging service
    // console.log('AUDIT:', JSON.stringify(logEntry))
  }

  static logSecurityEvent(event: {
    type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'csrf_violation'
    userId?: string
    ip?: string
    details?: any
  }) {
    this.log({
      action: 'security_event',
      resource: 'system',
      ...event
    })
  }
}

// Security middleware composer
export function createSecurityMiddleware(options: {
  rateLimit?: { windowMs: number; maxRequests: number }
  csrf?: boolean
  sanitizeInput?: boolean
} = {}) {
  const middlewares: Function[] = []
  
  // Always add security headers
  middlewares.push(securityHeaders)
  
  // Add rate limiting if specified
  if (options.rateLimit) {
    middlewares.push(RateLimiter.createLimiter(options.rateLimit))
  }
  
  // Add CSRF protection if specified
  if (options.csrf) {
    middlewares.push(CSRFProtection.middleware)
  }
  
  // Add input sanitization if specified
  if (options.sanitizeInput) {
    middlewares.push((req: NextApiRequest, res: NextApiResponse, next: Function) => {
      if (req.body) {
        req.body = InputSanitizer.sanitizeInput(req.body)
      }
      next()
    })
  }
  
  return (req: NextApiRequest, res: NextApiResponse, handler: Function) => {
    let index = 0
    
    function next(): void {
      if (index >= middlewares.length) {
        return handler(req, res)
      }
      
      const middleware = middlewares[index++]
      middleware(req, res, next)
    }
    
    next()
  }
}

// Setup periodic cleanup
setInterval(() => {
  RateLimiter.cleanup()
}, 5 * 60 * 1000) // Every 5 minutes

export default {
  InputSanitizer,
  XSSProtection,
  CSRFProtection,
  RateLimiter,
  DataEncryption,
  FileUploadSecurity,
  AuditLogger,
  securityHeaders,
  createSecurityMiddleware
}