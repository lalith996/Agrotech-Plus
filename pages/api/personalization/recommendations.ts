import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PersonalizationService } from '@/lib/personalization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { 
      limit = '20', 
      type = 'personalized' 
    } = req.query;

    const recommendationLimit = Math.min(parseInt(limit as string), 50);

    let recommendations;

    if (type === 'seasonal') {
      recommendations = await PersonalizationService.getSeasonalRecommendations(
        session.user.id,
        recommendationLimit
      );
    } else {
      recommendations = await PersonalizationService.getPersonalizedRecommendations(
        session.user.id,
        recommendationLimit
      );
    }

    res.status(200).json({
      success: true,
      type,
      recommendations,
      count: recommendations.length
    });

  } catch (error) {
    // console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations'
    });
  }
}