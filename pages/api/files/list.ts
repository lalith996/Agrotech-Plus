import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FileUploadService } from '@/lib/file-upload';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { 
      category, 
      entityType, 
      entityId, 
      page = '1', 
      limit = '20' 
    } = req.query;

    const filters = {
      category: typeof category === 'string' ? category : undefined,
      entityType: typeof entityType === 'string' ? entityType : undefined,
      entityId: typeof entityId === 'string' ? entityId : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    };

    const result = await FileUploadService.listFiles(session.user.id, filters);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    // console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
}