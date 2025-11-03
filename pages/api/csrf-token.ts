import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CSRFProtection } from '@/lib/security';

/**
 * CSRF Token API
 * Generates a CSRF token for authenticated requests
 * Token should be included in X-CSRF-Token header for mutations
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get session to use as session ID
    const session = await getServerSession(req, res, authOptions);

    // Generate session ID from user or fallback to IP
    const sessionId = session?.user?.id ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'anonymous';

    // Generate CSRF token
    const token = CSRFProtection.generateToken(sessionId);

    res.status(200).json({
      token,
      expiresIn: 3600, // 1 hour in seconds
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate CSRF token' });
  }
}
