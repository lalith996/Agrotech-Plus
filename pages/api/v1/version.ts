/**
 * API Version Info Endpoint
 * Returns API version information and changelog
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  API_CHANGELOG,
  getVersionChangelog,
} from '@/lib/api-versioning';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const version = 'v1';
  const changelog = getVersionChangelog(version);

  res.status(200).json({
    version,
    currentVersion: CURRENT_VERSION,
    supportedVersions: SUPPORTED_VERSIONS,
    changelog,
    endpoints: {
      products: '/api/v1/products',
      health: '/api/health',
      csrfToken: '/api/csrf-token',
      auth: '/api/auth',
    },
    documentation: 'https://docs.agrotrack.com/api/v1',
  });
}
