/**
 * API Type Definitions
 * Type-safe interfaces for API requests, responses, and database queries
 */

import { Prisma } from '@prisma/client';

// ===================================
// Product API Types
// ===================================

export interface ProductWhereInput {
  isActive?: boolean;
  category?: string | { in: string[] };
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    description?: { contains: string; mode: 'insensitive' };
  }>;
  farmerId?: string | { in: string[] };
  basePrice?: {
    gte?: number;
    lte?: number;
  };
}

export interface ProductQueryParams {
  category?: string | string[];
  search?: string | string[];
  farmerId?: string | string[];
  isActive?: string | string[];
  availability?: string | string[];
  minPrice?: string | string[];
  maxPrice?: string | string[];
  minRating?: string | string[];
  page?: string | string[];
  limit?: string | string[];
  categories?: string[];
  farmerIds?: string[];
}

// ===================================
// Order API Types
// ===================================

export interface OrderWhereInput {
  customerId?: string;
  status?: Prisma.OrderStatus | { in: Prisma.OrderStatus[] };
  deliveryDate?: {
    gte?: Date;
    lte?: Date;
  };
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  items?: {
    some: {
      product?: {
        farmerId?: string;
      };
    };
  };
}

export interface OrderQueryParams {
  page?: string | string[];
  limit?: string | string[];
  status?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
}

// ===================================
// Farmer API Types
// ===================================

export interface FarmerWhereInput {
  isApproved?: boolean;
  OR?: Array<{
    farmName?: { contains: string; mode: 'insensitive' };
    location?: { contains: string; mode: 'insensitive' };
    user?: {
      name?: { contains: string; mode: 'insensitive' };
      email?: { contains: string; mode: 'insensitive' };
    };
  }>;
}

export interface FarmerQueryParams {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  limit?: string | string[];
}

// ===================================
// Subscription API Types
// ===================================

export interface SubscriptionWhereInput {
  customerId?: string;
  status?: Prisma.SubscriptionStatus | { in: Prisma.SubscriptionStatus[] };
  deliveryZone?: string;
  deliveryDay?: string;
}

// ===================================
// Common API Types
// ===================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    field?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ===================================
// Error Types
// ===================================

export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Business Logic
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DELIVERY_UNAVAILABLE = 'DELIVERY_UNAVAILABLE',
}

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown,
    public field?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON(): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        field: this.field,
      },
    };
  }
}

// ===================================
// Helper Functions
// ===================================

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: PaginationMeta
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
}

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  field?: string
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(field && { field }),
    },
  };
}

// ===================================
// HTTP Status Code Utilities
// ===================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export function getStatusCodeForError(code: ApiErrorCode): number {
  const statusMap: Record<ApiErrorCode, number> = {
    [ApiErrorCode.UNAUTHORIZED]: HTTP_STATUS.UNAUTHORIZED,
    [ApiErrorCode.FORBIDDEN]: HTTP_STATUS.FORBIDDEN,
    [ApiErrorCode.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
    [ApiErrorCode.SESSION_EXPIRED]: HTTP_STATUS.UNAUTHORIZED,
    [ApiErrorCode.VALIDATION_ERROR]: HTTP_STATUS.BAD_REQUEST,
    [ApiErrorCode.INVALID_INPUT]: HTTP_STATUS.BAD_REQUEST,
    [ApiErrorCode.MISSING_REQUIRED_FIELD]: HTTP_STATUS.BAD_REQUEST,
    [ApiErrorCode.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
    [ApiErrorCode.ALREADY_EXISTS]: HTTP_STATUS.CONFLICT,
    [ApiErrorCode.CONFLICT]: HTTP_STATUS.CONFLICT,
    [ApiErrorCode.RATE_LIMIT_EXCEEDED]: HTTP_STATUS.TOO_MANY_REQUESTS,
    [ApiErrorCode.INTERNAL_SERVER_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    [ApiErrorCode.DATABASE_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: HTTP_STATUS.SERVICE_UNAVAILABLE,
    [ApiErrorCode.INSUFFICIENT_STOCK]: HTTP_STATUS.CONFLICT,
    [ApiErrorCode.PAYMENT_FAILED]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    [ApiErrorCode.DELIVERY_UNAVAILABLE]: HTTP_STATUS.CONFLICT,
  };

  return statusMap[code] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
}
