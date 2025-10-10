import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OCRService } from '@/lib/ocr-service';

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
      q: query, 
      category, 
      entityType, 
      page = '1', 
      limit = '20' 
    } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const filters = {
      category: typeof category === 'string' ? category : undefined,
      entityType: typeof entityType === 'string' ? entityType : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    };

    const results = await OCRService.searchByText(query, session.user.id, filters);

    res.status(200).json({
      success: true,
      query,
      ...results
    });

  } catch (error) {
    // console.error('File search error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Search failed'
    });
  }
}