/**
 * API Versioning Utilities
 * Handles API version routing and backward compatibility
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { logWarn, logInfo } from './logger';

export type ApiVersion = 'v1' | 'v2';
export const CURRENT_VERSION: ApiVersion = 'v1';
export const SUPPORTED_VERSIONS: ApiVersion[] = ['v1'];

export interface VersionedHandler {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;
}

/**
 * Get API version from request
 * Checks (in order):
 * 1. X-API-Version header
 * 2. Accept-Version header
 * 3. Query parameter ?version=v1
 * 4. URL path /api/v1/...
 * 5. Default to current version
 */
export function getApiVersion(req: NextApiRequest): ApiVersion {
  // Check headers
  const headerVersion = (req.headers['x-api-version'] || req.headers['accept-version']) as string;
  if (headerVersion && isSupportedVersion(headerVersion as ApiVersion)) {
    return headerVersion as ApiVersion;
  }

  // Check query parameter
  const queryVersion = req.query.version as string;
  if (queryVersion && isSupportedVersion(queryVersion as ApiVersion)) {
    return queryVersion as ApiVersion;
  }

  // Check URL path
  const path = req.url || '';
  const pathMatch = path.match(/\/api\/(v\d+)\//);
  if (pathMatch && isSupportedVersion(pathMatch[1] as ApiVersion)) {
    return pathMatch[1] as ApiVersion;
  }

  // Default to current version
  return CURRENT_VERSION;
}

/**
 * Check if version is supported
 */
export function isSupportedVersion(version: ApiVersion): boolean {
  return SUPPORTED_VERSIONS.includes(version);
}

/**
 * Version-aware API handler
 * Routes requests to version-specific handlers
 */
export function versionedHandler(handlers: VersionedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const version = getApiVersion(req);

    // Check if version is supported
    if (!isSupportedVersion(version)) {
      logWarn('Unsupported API version requested', {
        requestedVersion: version,
        supportedVersions: SUPPORTED_VERSIONS,
        path: req.url,
      });

      return res.status(400).json({
        error: 'Unsupported API Version',
        message: `API version '${version}' is not supported`,
        supportedVersions: SUPPORTED_VERSIONS,
        currentVersion: CURRENT_VERSION,
      });
    }

    // Get handler for version
    const handler = handlers[version];

    if (!handler) {
      logWarn('No handler for API version', {
        version,
        path: req.url,
        availableVersions: Object.keys(handlers),
      });

      return res.status(501).json({
        error: 'Version Not Implemented',
        message: `This endpoint does not support version '${version}'`,
        supportedVersions: Object.keys(handlers),
      });
    }

    // Set version in response headers
    res.setHeader('X-API-Version', version);
    res.setHeader('X-API-Current-Version', CURRENT_VERSION);
    res.setHeader('X-API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));

    // Call version-specific handler
    try {
      await handler(req, res);
    } catch (error) {
      throw error;
    }
  };
}

/**
 * API deprecation warning middleware
 */
export function deprecationWarning(
  version: ApiVersion,
  deprecatedSince: Date,
  sunsetDate: Date,
  message?: string
) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const currentVersion = getApiVersion(req);

    if (currentVersion === version) {
      const daysUntilSunset = Math.ceil(
        (sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      logWarn('Deprecated API version used', {
        version,
        path: req.url,
        daysUntilSunset,
      });

      // Add deprecation headers
      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('X-API-Deprecated-Since', deprecatedSince.toISOString());
      res.setHeader('X-API-Sunset', sunsetDate.toISOString());
      res.setHeader('X-API-Sunset-Days', daysUntilSunset.toString());

      if (message) {
        res.setHeader('X-API-Deprecation-Message', message);
      }
    }

    next();
  };
}

/**
 * Migration helper for version changes
 */
export interface VersionMigration {
  from: ApiVersion;
  to: ApiVersion;
  transform: (data: any) => any;
}

/**
 * Apply version migrations to response data
 */
export function applyMigration(
  data: any,
  fromVersion: ApiVersion,
  toVersion: ApiVersion,
  migrations: VersionMigration[]
): any {
  const migration = migrations.find(
    m => m.from === fromVersion && m.to === toVersion
  );

  if (!migration) {
    return data;
  }

  try {
    return migration.transform(data);
  } catch (error) {
    logWarn('Failed to apply API migration', {
      fromVersion,
      toVersion,
      error: error instanceof Error ? error.message : String(error),
    });
    return data;
  }
}

/**
 * Version changelog tracker
 */
export interface VersionChangelog {
  version: ApiVersion;
  releaseDate: Date;
  changes: {
    added?: string[];
    changed?: string[];
    deprecated?: string[];
    removed?: string[];
    fixed?: string[];
  };
}

export const API_CHANGELOG: VersionChangelog[] = [
  {
    version: 'v1',
    releaseDate: new Date('2024-01-01'),
    changes: {
      added: [
        'Initial API release',
        'Authentication endpoints',
        'Product management',
        'Order processing',
        'Farmer management',
        'Customer management',
        'Logistics tracking',
      ],
    },
  },
];

/**
 * Get changelog for specific version
 */
export function getVersionChangelog(version: ApiVersion): VersionChangelog | undefined {
  return API_CHANGELOG.find(log => log.version === version);
}

/**
 * Get all changes since a version
 */
export function getChangesSince(version: ApiVersion): VersionChangelog[] {
  const versionIndex = API_CHANGELOG.findIndex(log => log.version === version);

  if (versionIndex === -1) {
    return API_CHANGELOG;
  }

  return API_CHANGELOG.slice(versionIndex + 1);
}

/**
 * API version response wrapper
 * Adds version metadata to responses
 */
export function versionedResponse(
  res: NextApiResponse,
  data: any,
  version: ApiVersion = CURRENT_VERSION,
  status: number = 200
) {
  res.status(status).json({
    version,
    timestamp: new Date().toISOString(),
    data,
  });
}

/**
 * Example usage:
 *
 * // Single versioned endpoint
 * export default versionedHandler({
 *   v1: async (req, res) => {
 *     // v1 implementation
 *     res.json({ message: 'v1 response' })
 *   },
 *   v2: async (req, res) => {
 *     // v2 implementation with breaking changes
 *     res.json({ msg: 'v2 response', data: {} })
 *   }
 * })
 *
 * // With deprecation warning
 * const handler = versionedHandler({
 *   v1: (req, res) => { ... }
 * })
 *
 * export default async (req: NextApiRequest, res: NextApiResponse) => {
 *   const deprecated = deprecationWarning(
 *     'v1',
 *     new Date('2024-01-01'),
 *     new Date('2024-12-31'),
 *     'Please migrate to v2'
 *   )
 *
 *   deprecated(req, res, () => handler(req, res))
 * }
 */
