/**
 * Query Parameter Validation Utilities
 * Provides type-safe validation for URL query parameters
 */

import { z } from 'zod';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Validate and parse pagination parameters
 */
export function validatePagination(
  page?: string | string[],
  limit?: string | string[],
  options: {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
  } = {}
): PaginationParams {
  const {
    defaultPage = 1,
    defaultLimit = 12,
    maxLimit = 100,
  } = options;

  // Parse page
  const pageStr = Array.isArray(page) ? page[0] : page;
  const parsedPage = parseInt(pageStr || String(defaultPage), 10);
  const validPage = isNaN(parsedPage) || parsedPage < 1 ? defaultPage : parsedPage;

  // Parse limit
  const limitStr = Array.isArray(limit) ? limit[0] : limit;
  const parsedLimit = parseInt(limitStr || String(defaultLimit), 10);
  const validLimit = isNaN(parsedLimit) || parsedLimit < 1
    ? defaultLimit
    : Math.min(parsedLimit, maxLimit);

  return {
    page: validPage,
    limit: validLimit,
    skip: (validPage - 1) * validLimit,
  };
}

/**
 * Validate and parse sort parameters
 */
export function validateSort(
  sortBy?: string | string[],
  sortOrder?: string | string[],
  allowedFields: string[] = []
): SortParams {
  const sortByStr = Array.isArray(sortBy) ? sortBy[0] : sortBy;
  const sortOrderStr = Array.isArray(sortOrder) ? sortOrder[0] : sortOrder;

  // Validate sortBy
  const validSortBy = sortByStr && allowedFields.includes(sortByStr)
    ? sortByStr
    : undefined;

  // Validate sortOrder
  const validSortOrder = sortOrderStr === 'asc' || sortOrderStr === 'desc'
    ? sortOrderStr
    : 'desc';

  return {
    sortBy: validSortBy,
    sortOrder: validSortOrder,
  };
}

/**
 * Validate string parameter
 */
export function validateString(
  value?: string | string[],
  options: {
    default?: string;
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
  } = {}
): string | undefined {
  const {
    default: defaultValue,
    maxLength = 1000,
    minLength = 0,
    pattern,
  } = options;

  const str = Array.isArray(value) ? value[0] : value;

  if (!str || str.trim() === '') {
    return defaultValue;
  }

  // Check length
  if (str.length > maxLength || str.length < minLength) {
    return defaultValue;
  }

  // Check pattern
  if (pattern && !pattern.test(str)) {
    return defaultValue;
  }

  return str.trim();
}

/**
 * Validate number parameter
 */
export function validateNumber(
  value?: string | string[],
  options: {
    default?: number;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): number | undefined {
  const {
    default: defaultValue,
    min = -Infinity,
    max = Infinity,
    integer = false,
  } = options;

  const str = Array.isArray(value) ? value[0] : value;

  if (!str) {
    return defaultValue;
  }

  const num = integer ? parseInt(str, 10) : parseFloat(str);

  if (isNaN(num)) {
    return defaultValue;
  }

  // Check range
  if (num < min || num > max) {
    return defaultValue;
  }

  return num;
}

/**
 * Validate boolean parameter
 */
export function validateBoolean(
  value?: string | string[],
  defaultValue: boolean = false
): boolean {
  const str = Array.isArray(value) ? value[0] : value;

  if (!str) {
    return defaultValue;
  }

  const lowerStr = str.toLowerCase();

  if (lowerStr === 'true' || lowerStr === '1' || lowerStr === 'yes') {
    return true;
  }

  if (lowerStr === 'false' || lowerStr === '0' || lowerStr === 'no') {
    return false;
  }

  return defaultValue;
}

/**
 * Validate enum parameter
 */
export function validateEnum<T extends string>(
  value?: string | string[],
  allowedValues: T[] = [],
  defaultValue?: T
): T | undefined {
  const str = Array.isArray(value) ? value[0] : value;

  if (!str) {
    return defaultValue;
  }

  if (allowedValues.includes(str as T)) {
    return str as T;
  }

  return defaultValue;
}

/**
 * Validate array parameter
 */
export function validateArray(
  value?: string | string[],
  options: {
    maxItems?: number;
    itemValidator?: (item: string) => boolean;
  } = {}
): string[] {
  const {
    maxItems = 100,
    itemValidator,
  } = options;

  if (!value) {
    return [];
  }

  const arr = Array.isArray(value) ? value : [value];

  // Limit array size
  const limitedArr = arr.slice(0, maxItems);

  // Validate each item if validator provided
  if (itemValidator) {
    return limitedArr.filter(itemValidator);
  }

  return limitedArr;
}

/**
 * Validate date parameter
 */
export function validateDate(
  value?: string | string[],
  options: {
    default?: Date;
    min?: Date;
    max?: Date;
  } = {}
): Date | undefined {
  const {
    default: defaultValue,
    min,
    max,
  } = options;

  const str = Array.isArray(value) ? value[0] : value;

  if (!str) {
    return defaultValue;
  }

  const date = new Date(str);

  if (isNaN(date.getTime())) {
    return defaultValue;
  }

  // Check range
  if (min && date < min) {
    return defaultValue;
  }

  if (max && date > max) {
    return defaultValue;
  }

  return date;
}

/**
 * Validate ID parameter (CUID format)
 */
export function validateId(
  value?: string | string[],
  options: {
    required?: boolean;
  } = {}
): string | undefined {
  const { required = false } = options;

  const str = Array.isArray(value) ? value[0] : value;

  if (!str) {
    if (required) {
      throw new Error('ID parameter is required');
    }
    return undefined;
  }

  // CUID format: c + 24 characters
  const cuidPattern = /^c[a-z0-9]{24,}$/i;

  if (!cuidPattern.test(str)) {
    if (required) {
      throw new Error('Invalid ID format');
    }
    return undefined;
  }

  return str;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(
  query?: string | string[],
  options: {
    maxLength?: number;
  } = {}
): string | undefined {
  const { maxLength = 200 } = options;

  const str = Array.isArray(query) ? query[0] : query;

  if (!str || str.trim() === '') {
    return undefined;
  }

  // Remove special characters that could cause issues
  const sanitized = str
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags

  if (sanitized.length === 0) {
    return undefined;
  }

  return sanitized;
}

/**
 * Create a query validator schema using Zod
 */
export function createQuerySchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).partial();
}

/**
 * Parse and validate query parameters using Zod schema
 */
export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  query: Record<string, any>
): z.infer<T> {
  try {
    return schema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(
        `Invalid query parameter '${firstError.path.join('.')}': ${firstError.message}`
      );
    }
    throw error;
  }
}

// Common query schemas
export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const searchSchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
