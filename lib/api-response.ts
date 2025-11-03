/**
 * API Response Utilities
 * Standardized response helpers for consistent API responses
 */

import { NextApiResponse } from 'next';
import { HTTP_STATUS, ApiErrorCode, createErrorResponse } from '@/types/api';
import { logError, logWarn } from './logger';

/**
 * Success response helpers
 */

export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  message?: string,
  statusCode: number = HTTP_STATUS.OK
) {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
    timestamp: new Date().toISOString(),
  });
}

export function sendCreated<T>(
  res: NextApiResponse,
  data: T,
  message: string = 'Resource created successfully'
) {
  return sendSuccess(res, data, message, HTTP_STATUS.CREATED);
}

export function sendNoContent(res: NextApiResponse) {
  return res.status(HTTP_STATUS.NO_CONTENT).end();
}

/**
 * Error response helpers
 */

export function sendError(
  res: NextApiResponse,
  errorCode: ApiErrorCode,
  message: string,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  details?: any,
  logContext?: Record<string, any>
) {
  if (statusCode >= 500) {
    logError(message, new Error(message), logContext);
  } else if (statusCode >= 400) {
    logWarn(message, logContext);
  }

  return res.status(statusCode).json(
    createErrorResponse(errorCode, message, details)
  );
}

export function sendBadRequest(
  res: NextApiResponse,
  message: string = 'Invalid request',
  details?: any
) {
  return sendError(
    res,
    ApiErrorCode.VALIDATION_ERROR,
    message,
    HTTP_STATUS.BAD_REQUEST,
    details
  );
}

export function sendUnauthorized(
  res: NextApiResponse,
  message: string = 'Unauthorized'
) {
  return sendError(
    res,
    ApiErrorCode.UNAUTHORIZED,
    message,
    HTTP_STATUS.UNAUTHORIZED
  );
}

export function sendForbidden(
  res: NextApiResponse,
  message: string = 'Access denied'
) {
  return sendError(
    res,
    ApiErrorCode.FORBIDDEN,
    message,
    HTTP_STATUS.FORBIDDEN
  );
}

export function sendNotFound(
  res: NextApiResponse,
  resource: string = 'Resource'
) {
  return sendError(
    res,
    ApiErrorCode.NOT_FOUND,
    `${resource} not found`,
    HTTP_STATUS.NOT_FOUND
  );
}

export function sendMethodNotAllowed(
  res: NextApiResponse,
  allowedMethods: string[] = []
) {
  if (allowedMethods.length > 0) {
    res.setHeader('Allow', allowedMethods.join(', '));
  }

  return sendError(
    res,
    ApiErrorCode.VALIDATION_ERROR,
    'Method not allowed',
    HTTP_STATUS.METHOD_NOT_ALLOWED,
    { allowedMethods }
  );
}

export function sendConflict(
  res: NextApiResponse,
  message: string = 'Resource conflict'
) {
  return sendError(
    res,
    ApiErrorCode.CONFLICT,
    message,
    HTTP_STATUS.CONFLICT
  );
}

export function sendRateLimitExceeded(
  res: NextApiResponse,
  retryAfter?: number
) {
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter.toString());
  }

  return sendError(
    res,
    ApiErrorCode.RATE_LIMIT_EXCEEDED,
    'Too many requests',
    HTTP_STATUS.TOO_MANY_REQUESTS,
    { retryAfter }
  );
}

export function sendInternalError(
  res: NextApiResponse,
  error?: Error,
  context?: Record<string, any>
) {
  // Log the error
  if (error) {
    logError('Internal server error', error, context);
  }

  // Don't expose internal error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error?.message || 'Internal server error';

  return sendError(
    res,
    ApiErrorCode.INTERNAL_ERROR,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}

export function sendDatabaseError(
  res: NextApiResponse,
  error?: Error,
  context?: Record<string, any>
) {
  if (error) {
    logError('Database error', error, context);
  }

  return sendError(
    res,
    ApiErrorCode.DATABASE_ERROR,
    'Database operation failed',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}

/**
 * Pagination response helper
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function sendPaginated<T>(
  res: NextApiResponse,
  items: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
) {
  const totalPages = Math.ceil(total / limit);

  const response: PaginatedResponse<T> = {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  return sendSuccess(res, response, message);
}

/**
 * Validation error helper
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export function sendValidationErrors(
  res: NextApiResponse,
  errors: ValidationError[]
) {
  return sendError(
    res,
    ApiErrorCode.VALIDATION_ERROR,
    'Validation failed',
    HTTP_STATUS.BAD_REQUEST,
    { errors }
  );
}

/**
 * File upload error helpers
 */
export function sendFileUploadError(
  res: NextApiResponse,
  reason: 'size' | 'type' | 'unknown',
  details?: any
) {
  const messages = {
    size: 'File size exceeds maximum allowed',
    type: 'File type not allowed',
    unknown: 'File upload failed',
  };

  return sendError(
    res,
    ApiErrorCode.VALIDATION_ERROR,
    messages[reason],
    HTTP_STATUS.BAD_REQUEST,
    details
  );
}

/**
 * Async handler wrapper
 * Automatically catches errors and sends standardized error response
 */
export function asyncHandler(
  handler: (req: any, res: NextApiResponse) => Promise<void>
) {
  return async (req: any, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      // Check if response already sent
      if (res.headersSent) {
        return;
      }

      sendInternalError(res, error instanceof Error ? error : new Error(String(error)), {
        path: req.url,
        method: req.method,
      });
    }
  };
}

/**
 * Response middleware
 * Adds standard headers to all responses
 */
export function responseMiddleware(
  req: any,
  res: NextApiResponse,
  next: () => void
) {
  // Add standard headers
  res.setHeader('X-Request-ID', req.headers['x-request-id'] || Date.now().toString());
  res.setHeader('X-Response-Time', Date.now().toString());

  // CORS headers (if needed)
  if (process.env.CORS_ENABLED === 'true') {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }

  next();
}

/**
 * Example usage:
 *
 * // Success response
 * return sendSuccess(res, { products })
 *
 * // Created response
 * return sendCreated(res, { user }, 'User created successfully')
 *
 * // Error responses
 * return sendBadRequest(res, 'Invalid email format')
 * return sendUnauthorized(res)
 * return sendNotFound(res, 'Product')
 * return sendInternalError(res, error)
 *
 * // Paginated response
 * return sendPaginated(res, products, page, limit, total)
 *
 * // Validation errors
 * return sendValidationErrors(res, [
 *   { field: 'email', message: 'Invalid email' },
 *   { field: 'password', message: 'Too short' }
 * ])
 *
 * // Async handler wrapper
 * export default asyncHandler(async (req, res) => {
 *   const data = await fetchData()
 *   return sendSuccess(res, data)
 * })
 */
