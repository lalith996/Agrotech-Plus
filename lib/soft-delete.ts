/**
 * Soft Delete Pattern Implementation
 * Implements soft deletes for data retention and compliance
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logInfo, logWarn } from './logger';

/**
 * Models that support soft delete
 * Add 'deletedAt' field to these models in schema.prisma
 */
export const SOFT_DELETE_MODELS = [
  'User',
  'Customer',
  'Farmer',
  'Product',
  'Order',
  'OrderItem',
  'Address',
  'ProductReview',
  'Subscription',
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * Check if model supports soft delete
 */
export function supportsSoftDelete(modelName: string): modelName is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(modelName as SoftDeleteModel);
}

/**
 * Soft delete middleware for Prisma
 * Intercepts delete operations and converts them to updates
 */
export function setupSoftDeleteMiddleware() {
  // Middleware for delete operations
  prisma.$use(async (params, next) => {
    // Check if model supports soft delete
    if (!supportsSoftDelete(params.model || '')) {
      return next(params);
    }

    // Handle delete operation
    if (params.action === 'delete') {
      logInfo('Soft delete: Converting delete to update', {
        model: params.model,
        where: params.args.where,
      });

      // Change action to update and set deletedAt
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    // Handle deleteMany operation
    if (params.action === 'deleteMany') {
      logInfo('Soft delete: Converting deleteMany to updateMany', {
        model: params.model,
        where: params.args.where,
      });

      // Change action to updateMany
      params.action = 'updateMany';
      params.args.data = { deletedAt: new Date() };
    }

    return next(params);
  });

  // Middleware to exclude soft-deleted records from queries
  prisma.$use(async (params, next) => {
    // Check if model supports soft delete
    if (!supportsSoftDelete(params.model || '')) {
      return next(params);
    }

    // Add deletedAt filter to read operations
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }

    if (params.action === 'findMany') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    if (params.action === 'count') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    if (params.action === 'aggregate') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    return next(params);
  });

  logInfo('Soft delete middleware initialized', {
    models: SOFT_DELETE_MODELS,
  });
}

/**
 * Hard delete (permanently delete) a record
 * Use with caution - this is irreversible!
 */
export async function hardDelete<T extends SoftDeleteModel>(
  model: T,
  where: any,
  context?: { reason?: string; userId?: string }
): Promise<boolean> {
  logWarn('Hard delete operation', {
    model,
    where,
    ...context,
  });

  try {
    const modelDelegate = (prisma as any)[model.toLowerCase()];

    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }

    // Use parameterized query to prevent SQL injection
    const tableName = model.toLowerCase();
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    if (whereKeys.length === 0) {
      throw new Error('Where clause cannot be empty for hard delete');
    }

    // Build parameterized WHERE clause: column1 = $1 AND column2 = $2
    const whereClause = whereKeys
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(' AND ');

    // Use $executeRaw with template literal for safe parameterized query
    await prisma.$executeRaw(
      Prisma.sql([
        `DELETE FROM "${tableName}" WHERE ${whereClause}`,
      ] as any as TemplateStringsArray, ...whereValues)
    );

    return true;
  } catch (error) {
    logWarn('Hard delete failed', {
      model,
      where,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Restore a soft-deleted record
 */
export async function restore<T extends SoftDeleteModel>(
  model: T,
  where: any
): Promise<boolean> {
  try {
    const modelDelegate = (prisma as any)[model.toLowerCase()];

    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }

    await modelDelegate.updateMany({
      where: {
        ...where,
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
      },
    });

    logInfo('Record restored', {
      model,
      where,
    });

    return true;
  } catch (error) {
    logWarn('Restore failed', {
      model,
      where,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Find soft-deleted records (trash)
 */
export async function findDeleted<T extends SoftDeleteModel>(
  model: T,
  options?: {
    where?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }
): Promise<any[]> {
  const modelDelegate = (prisma as any)[model.toLowerCase()];

  if (!modelDelegate) {
    throw new Error(`Model ${model} not found`);
  }

  return modelDelegate.findMany({
    where: {
      ...(options?.where || {}),
      deletedAt: { not: null },
    },
    orderBy: options?.orderBy || { deletedAt: 'desc' },
    take: options?.take,
    skip: options?.skip,
  });
}

/**
 * Count soft-deleted records
 */
export async function countDeleted<T extends SoftDeleteModel>(
  model: T,
  where?: any
): Promise<number> {
  const modelDelegate = (prisma as any)[model.toLowerCase()];

  if (!modelDelegate) {
    throw new Error(`Model ${model} not found`);
  }

  return modelDelegate.count({
    where: {
      ...(where || {}),
      deletedAt: { not: null },
    },
  });
}

/**
 * Permanently delete old soft-deleted records
 * Used for cleanup jobs
 */
export async function purgeOldDeleted<T extends SoftDeleteModel>(
  model: T,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  logInfo('Purging old deleted records', {
    model,
    olderThanDays,
    cutoffDate: cutoffDate.toISOString(),
  });

  try {
    const tableName = model.toLowerCase();

    // Use parameterized query with $executeRaw for safety
    const result = await prisma.$executeRaw`
      DELETE FROM ${Prisma.raw(`"${tableName}"`)}
      WHERE "deletedAt" IS NOT NULL
      AND "deletedAt" < ${cutoffDate}
    `;

    logInfo('Purge completed', {
      model,
      deletedCount: result,
    });

    return Number(result);
  } catch (error) {
    logWarn('Purge failed', {
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Include deleted records in query
 * Use this to override the middleware filter
 */
export function withDeleted() {
  return {
    deletedAt: { not: undefined },
  };
}

/**
 * Only get deleted records
 */
export function onlyDeleted() {
  return {
    deletedAt: { not: null },
  };
}

/**
 * Utility to check if record is soft-deleted
 */
export function isDeleted(record: any): boolean {
  return record?.deletedAt !== null && record?.deletedAt !== undefined;
}

/**
 * Get deletion info
 */
export interface DeletionInfo {
  isDeleted: boolean;
  deletedAt?: Date;
  daysSinceDeleted?: number;
}

export function getDeletionInfo(record: any): DeletionInfo {
  if (!isDeleted(record)) {
    return { isDeleted: false };
  }

  const deletedAt = new Date(record.deletedAt);
  const daysSinceDeleted = Math.floor(
    (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isDeleted: true,
    deletedAt,
    daysSinceDeleted,
  };
}

/**
 * Example usage:
 *
 * // Setup middleware in your app initialization
 * setupSoftDeleteMiddleware()
 *
 * // Normal delete - becomes soft delete automatically
 * await prisma.user.delete({ where: { id: '123' } })
 *
 * // Hard delete (permanent)
 * await hardDelete('User', { id: '123' }, { reason: 'GDPR request', userId: 'admin' })
 *
 * // Restore deleted record
 * await restore('User', { id: '123' })
 *
 * // Find deleted records
 * const deleted = await findDeleted('User', { take: 10 })
 *
 * // Include deleted in query
 * await prisma.user.findMany({ where: withDeleted() })
 *
 * // Only deleted records
 * await prisma.user.findMany({ where: onlyDeleted() })
 *
 * // Purge old deleted records (cleanup job)
 * await purgeOldDeleted('User', 30) // older than 30 days
 */
