/**
 * Rate Limiting Middleware
 * Protects sensitive endpoints from brute force attacks
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { cacheService } from './redis';
import { logWarn, logError } from './logger';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Unique identifier for the rate limit (default: endpoint path)
   */
  identifier?: string;

  /**
   * Custom key generator function (default: uses IP address)
   */
  keyGenerator?: (req: NextApiRequest) => string;

  /**
   * Custom error message
   */
  message?: string;

  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (req: NextApiRequest) => boolean;
}

interface RateLimitData {
  count: number;
  resetAt: number;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress || 'unknown';

  return ip;
}

/**
 * Generate rate limit cache key
 */
function generateRateLimitKey(
  config: RateLimitConfig,
  req: NextApiRequest
): string {
  const identifier = config.identifier || req.url || 'api';
  const clientKey = config.keyGenerator ? config.keyGenerator(req) : getClientIp(req);

  return `ratelimit:${identifier}:${clientKey}`;
}

/**
 * Check if request should be rate limited
 */
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  try {
    // Try to get from cache
    const cached = await cacheService.get<RateLimitData>(
      key,
      async () => ({
        count: 0,
        resetAt: now + windowMs,
      }),
      { redisTTL: config.windowSeconds, memoryTTL: config.windowSeconds }
    );

    // Check if window has expired
    if (now >= cached.resetAt) {
      const newData: RateLimitData = {
        count: 1,
        resetAt: now + windowMs,
      };

      await cacheService.set(key, newData, {
        redisTTL: config.windowSeconds,
        memoryTTL: config.windowSeconds,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: newData.resetAt,
      };
    }

    // Increment count
    const newCount = cached.count + 1;
    const allowed = newCount <= config.maxRequests;

    // Update cache
    await cacheService.set(
      key,
      { count: newCount, resetAt: cached.resetAt },
      { redisTTL: config.windowSeconds, memoryTTL: config.windowSeconds }
    );

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - newCount),
      resetAt: cached.resetAt,
    };
  } catch (error) {
    logError('Rate limit check failed', error instanceof Error ? error : new Error(String(error)));

    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + windowMs,
    };
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void | Promise<void>
  ): Promise<void> => {
    // Check skip condition
    if (config.skip && config.skip(req)) {
      return next();
    }

    const key = generateRateLimitKey(config, req);
    const result = await checkRateLimit(key, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

    if (!result.allowed) {
      const clientIp = getClientIp(req);

      logWarn('Rate limit exceeded', {
        path: req.url,
        method: req.method,
        ip: clientIp,
        limit: config.maxRequests,
        window: config.windowSeconds,
      });

      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      res.status(429).json({
        error: 'Too Many Requests',
        message: config.message || 'Too many requests, please try again later.',
        retryAfter,
      });

      return;
    }

    return next();
  };
}

/**
 * Wrap API handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  config: RateLimitConfig
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const rateLimitMiddleware = rateLimit(config);

    return new Promise<void>((resolve, reject) => {
      rateLimitMiddleware(req, res, async () => {
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

// Predefined rate limit configurations

/**
 * Strict rate limit for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimit: RateLimitConfig = {
  maxRequests: 5,
  windowSeconds: 15 * 60, // 15 minutes
  identifier: 'auth',
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
};

/**
 * Rate limit for registration endpoints
 * 3 requests per hour per IP
 */
export const registrationRateLimit: RateLimitConfig = {
  maxRequests: 3,
  windowSeconds: 60 * 60, // 1 hour
  identifier: 'registration',
  message: 'Too many registration attempts. Please try again later.',
};

/**
 * Rate limit for password reset endpoints
 * 3 requests per hour per IP
 */
export const passwordResetRateLimit: RateLimitConfig = {
  maxRequests: 3,
  windowSeconds: 60 * 60, // 1 hour
  identifier: 'password-reset',
  message: 'Too many password reset attempts. Please try again later.',
};

/**
 * Rate limit for API endpoints
 * 100 requests per 15 minutes per IP
 */
export const apiRateLimit: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 15 * 60, // 15 minutes
  identifier: 'api',
  message: 'API rate limit exceeded. Please try again later.',
};

/**
 * Rate limit for search endpoints
 * 30 requests per minute per IP
 */
export const searchRateLimit: RateLimitConfig = {
  maxRequests: 30,
  windowSeconds: 60, // 1 minute
  identifier: 'search',
  message: 'Too many search requests. Please slow down.',
};

/**
 * Rate limit based on user ID instead of IP
 */
export function userRateLimit(
  userId: string,
  config: Omit<RateLimitConfig, 'keyGenerator'>
): RateLimitConfig {
  return {
    ...config,
    keyGenerator: () => userId,
  };
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(
  config: RateLimitConfig,
  req: NextApiRequest
): Promise<void> {
  const key = generateRateLimitKey(config, req);

  try {
    await cacheService.delete(key);
  } catch (error) {
    logError('Failed to reset rate limit', error instanceof Error ? error : new Error(String(error)), { key });
  }
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(
  config: RateLimitConfig,
  req: NextApiRequest
): Promise<{ count: number; remaining: number; resetAt: number } | null> {
  const key = generateRateLimitKey(config, req);

  try {
    const data = await cacheService.get<RateLimitData>(
      key,
      async () => ({ count: 0, resetAt: Date.now() + config.windowSeconds * 1000 }),
      { skipRedis: false }
    );

    return {
      count: data.count,
      remaining: Math.max(0, config.maxRequests - data.count),
      resetAt: data.resetAt,
    };
  } catch (error) {
    logError('Failed to get rate limit status', error instanceof Error ? error : new Error(String(error)), { key });
    return null;
  }
}
