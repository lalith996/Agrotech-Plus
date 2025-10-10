import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PersonalizationService } from '@/lib/personalization';
import { z } from 'zod';

const trackingSchema = z.object({
  productId: z.string(),
  action: z.enum(['view', 'add_to_cart', 'purchase', 'like', 'share'])
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validationResult = trackingSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tracking data',
        errors: validationResult.error.errors
      });
    }

    const { productId, action } = validationResult.data;

    await PersonalizationService.trackUserInteraction(
      session.user.id,
      productId,
      action
    );

    res.status(200).json({
      success: true,
      message: 'Interaction tracked successfully'
    });

  } catch (error) {
    // console.error('Track interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction'
    });
  }
}