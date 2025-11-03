/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { CSRFProtection } from './security';
import { logWarn, logSecurity } from './logger';

export interface CSRFConfig {
  /**
   * Skip CSRF validation for certain endpoints
   */
  skipPaths?: string[];

  /**
   * Only validate for specific methods (default: POST, PUT, DELETE, PATCH)
   */
  methods?: string[];

  /**
   * Custom error message
   */
  errorMessage?: string;
}

const DEFAULT_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Get session ID from request
 */
async function getSessionId(req: NextApiRequest, res: NextApiResponse): Promise<string> {
  // Try to get session from NextAuth
  const session = await getServerSession(req, res, authOptions);

  if (session?.user?.id) {
    return session.user.id;
  }

  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress || 'unknown';

  return `ip:${ip}`;
}

/**
 * CSRF validation middleware
 */
export function csrfProtection(config: CSRFConfig = {}) {
  const {
    skipPaths = [],
    methods = DEFAULT_METHODS,
    errorMessage = 'Invalid or missing CSRF token',
  } = config;

  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void | Promise<void>
  ): Promise<void> => {
    // Skip safe methods (GET, HEAD, OPTIONS)
    if (!methods.includes(req.method || '')) {
      return next();
    }

    // Skip certain paths if configured
    const path = req.url || '';
    if (skipPaths.some(skipPath => path.includes(skipPath))) {
      return next();
    }

    // Get CSRF token from headers
    const token = req.headers['x-csrf-token'] as string;

    if (!token) {
      logSecurity('CSRF token missing', {
        path: req.url,
        method: req.method,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });

      res.status(403).json({
        error: 'CSRF Validation Failed',
        message: 'CSRF token is required',
      });
      return;
    }

    // Get session ID
    const sessionId = await getSessionId(req, res);

    // Verify token
    const isValid = CSRFProtection.verifyToken(token, sessionId);

    if (!isValid) {
      logSecurity('CSRF token validation failed', {
        path: req.url,
        method: req.method,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        sessionId,
      });

      res.status(403).json({
        error: 'CSRF Validation Failed',
        message: errorMessage,
      });
      return;
    }

    // Token is valid, proceed
    return next();
  };
}

/**
 * Wrap API handler with CSRF protection
 */
export function withCSRF(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  config: CSRFConfig = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const middleware = csrfProtection(config);

    return new Promise<void>((resolve, reject) => {
      middleware(req, res, async () => {
        try {
          await handler(req, res);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}

/**
 * Predefined CSRF configurations
 */

/**
 * Strict CSRF for admin endpoints
 */
export const adminCSRF: CSRFConfig = {
  methods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  errorMessage: 'Invalid CSRF token for admin action',
};

/**
 * CSRF for user mutations
 */
export const userCSRF: CSRFConfig = {
  methods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  errorMessage: 'Invalid CSRF token',
};

/**
 * Skip CSRF for public endpoints
 */
export const publicCSRF: CSRFConfig = {
  skipPaths: ['/api/auth', '/api/health', '/api/csrf-token'],
  methods: [],
};
