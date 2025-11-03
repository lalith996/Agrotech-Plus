/**
 * Pagination Utilities
 * Provides both offset-based and cursor-based pagination for optimal performance
 */

import { Prisma } from '@prisma/client';
import { validatePagination, validateNumber, validateString } from './query-validation';
import { sendPaginated } from './api-response';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Offset-based pagination parameters
 */
export interface OffsetPaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams<T = any> {
  cursor?: T;
  take: number;
  direction?: 'forward' | 'backward';
}

/**
 * Pagination result with metadata
 */
export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page?: number;
    limit?: number;
    total: number;
    totalPages?: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: any;
    prevCursor?: any;
  };
}

/**
 * Parse offset pagination from request
 */
export function parseOffsetPagination(
  req: NextApiRequest,
  options: {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
  } = {}
): OffsetPaginationParams {
  const { page: pageQuery, limit: limitQuery } = req.query;

  return validatePagination(pageQuery, limitQuery, {
    defaultPage: options.defaultPage || 1,
    defaultLimit: options.defaultLimit || 20,
    maxLimit: options.maxLimit || 100,
  });
}

/**
 * Parse cursor pagination from request
 */
export function parseCursorPagination(
  req: NextApiRequest,
  options: {
    defaultTake?: number;
    maxTake?: number;
  } = {}
): CursorPaginationParams {
  const { cursor, take, direction } = req.query;

  const parsedTake = validateNumber(take, {
    default: options.defaultTake || 20,
    min: 1,
    max: options.maxTake || 100,
    integer: true,
  });

  const parsedDirection =
    direction === 'forward' || direction === 'backward' ? direction : 'forward';

  return {
    cursor: cursor ? String(cursor) : undefined,
    take: parsedTake || 20,
    direction: parsedDirection,
  };
}

/**
 * Create offset-based pagination query for Prisma
 */
export function createOffsetQuery<T>(
  params: OffsetPaginationParams,
  options?: {
    orderBy?: any;
    where?: any;
    include?: any;
    select?: any;
  }
): Prisma.SelectSubset<T, any> {
  return {
    skip: params.skip,
    take: params.limit,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.where && { where: options.where }),
    ...(options?.include && { include: options.include }),
    ...(options?.select && { select: options.select }),
  } as any;
}

/**
 * Create cursor-based pagination query for Prisma
 * Better performance for large datasets
 */
export function createCursorQuery<T>(
  params: CursorPaginationParams,
  cursorField: string = 'id',
  options?: {
    orderBy?: any;
    where?: any;
    include?: any;
    select?: any;
  }
): Prisma.SelectSubset<T, any> {
  const query: any = {
    take: params.take + 1, // Fetch one extra to check if there's more
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.where && { where: options.where }),
    ...(options?.include && { include: options.include }),
    ...(options?.select && { select: options.select }),
  };

  // Add cursor if provided
  if (params.cursor) {
    query.cursor = {
      [cursorField]: params.cursor,
    };
    query.skip = 1; // Skip the cursor itself
  }

  return query as any;
}

/**
 * Process cursor-based results
 * Extracts metadata and determines if there are more results
 */
export function processCursorResults<T extends { id: string }>(
  results: T[],
  take: number,
  cursorField: string = 'id'
): {
  items: T[];
  hasNext: boolean;
  nextCursor?: string;
} {
  const hasNext = results.length > take;
  const items = hasNext ? results.slice(0, take) : results;

  return {
    items,
    hasNext,
    nextCursor: hasNext && items.length > 0 ? (items[items.length - 1] as any)[cursorField] : undefined,
  };
}

/**
 * Helper function to paginate with offset
 */
export async function paginateWithOffset<T>(
  model: any,
  req: NextApiRequest,
  options?: {
    where?: any;
    orderBy?: any;
    include?: any;
    select?: any;
    defaultLimit?: number;
    maxLimit?: number;
  }
): Promise<PaginationResult<T>> {
  // Parse pagination params
  const pagination = parseOffsetPagination(req, {
    defaultLimit: options?.defaultLimit,
    maxLimit: options?.maxLimit,
  });

  // Build query
  const query = createOffsetQuery(pagination, {
    where: options?.where,
    orderBy: options?.orderBy || { createdAt: 'desc' },
    include: options?.include,
    select: options?.select,
  });

  // Execute queries in parallel
  const [items, total] = await Promise.all([
    model.findMany(query),
    model.count({ where: options?.where }),
  ]);

  // Calculate metadata
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  };
}

/**
 * Helper function to paginate with cursor
 */
export async function paginateWithCursor<T extends { id: string }>(
  model: any,
  req: NextApiRequest,
  options?: {
    where?: any;
    orderBy?: any;
    include?: any;
    select?: any;
    cursorField?: string;
    defaultTake?: number;
    maxTake?: number;
  }
): Promise<PaginationResult<T>> {
  const cursorField = options?.cursorField || 'id';

  // Parse pagination params
  const pagination = parseCursorPagination(req, {
    defaultTake: options?.defaultTake,
    maxTake: options?.maxTake,
  });

  // Build query
  const query = createCursorQuery(pagination, cursorField, {
    where: options?.where,
    orderBy: options?.orderBy || { createdAt: 'desc' },
    include: options?.include,
    select: options?.select,
  });

  // Execute query
  const results = await model.findMany(query);

  // Process results
  const { items, hasNext, nextCursor } = processCursorResults(
    results,
    pagination.take,
    cursorField
  );

  // Get total count (optional, can be expensive)
  const total = options?.where ? await model.count({ where: options.where }) : 0;

  return {
    items,
    pagination: {
      total,
      hasNext,
      hasPrev: !!pagination.cursor,
      nextCursor,
      prevCursor: pagination.cursor,
    },
  };
}

/**
 * Send paginated response
 * Wrapper around sendPaginated for consistent responses
 */
export function sendPaginatedResponse<T>(
  res: NextApiResponse,
  result: PaginationResult<T>,
  message?: string
) {
  return res.status(200).json({
    success: true,
    ...(message && { message }),
    data: result.items,
    pagination: result.pagination,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Search and paginate
 * Combines search functionality with pagination
 */
export async function searchAndPaginate<T>(
  model: any,
  req: NextApiRequest,
  searchFields: string[],
  options?: {
    where?: any;
    orderBy?: any;
    include?: any;
    select?: any;
    defaultLimit?: number;
    maxLimit?: number;
  }
): Promise<PaginationResult<T>> {
  const { search } = req.query;
  const searchQuery = validateString(search, { maxLength: 200 });

  // Build where clause with search
  let where = options?.where || {};

  if (searchQuery) {
    const searchConditions = searchFields.map(field => ({
      [field]: {
        contains: searchQuery,
        mode: 'insensitive' as const,
      },
    }));

    where = {
      ...where,
      OR: searchConditions,
    };
  }

  return paginateWithOffset(model, req, {
    ...options,
    where,
  });
}

/**
 * Pagination middleware
 * Adds pagination helpers to request
 */
export function paginationMiddleware(
  req: any,
  res: NextApiResponse,
  next: () => void
) {
  // Add pagination helpers to request
  req.pagination = {
    parseOffset: (options?: any) => parseOffsetPagination(req, options),
    parseCursor: (options?: any) => parseCursorPagination(req, options),
  };

  next();
}

/**
 * Calculate optimal page size based on data size
 */
export function calculateOptimalPageSize(
  averageItemSize: number,
  targetResponseSize: number = 100 * 1024 // 100KB default
): number {
  const estimatedPageSize = Math.floor(targetResponseSize / averageItemSize);
  return Math.max(10, Math.min(estimatedPageSize, 100)); // Between 10 and 100
}

/**
 * Example usage:
 *
 * // Offset-based pagination (simple)
 * export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   const result = await paginateWithOffset(prisma.product, req, {
 *     where: { isActive: true },
 *     orderBy: { createdAt: 'desc' }
 *   })
 *
 *   return sendPaginatedResponse(res, result)
 * }
 *
 * // Cursor-based pagination (better for large datasets)
 * export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   const result = await paginateWithCursor(prisma.product, req, {
 *     where: { isActive: true },
 *     orderBy: { createdAt: 'desc' },
 *     cursorField: 'createdAt'
 *   })
 *
 *   return sendPaginatedResponse(res, result)
 * }
 *
 * // Search with pagination
 * export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   const result = await searchAndPaginate(
 *     prisma.product,
 *     req,
 *     ['name', 'description'], // search fields
 *     {
 *       where: { isActive: true },
 *       orderBy: { name: 'asc' }
 *     }
 *   )
 *
 *   return sendPaginatedResponse(res, result)
 * }
 */
