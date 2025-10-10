import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PersonalizationService } from '@/lib/personalization';
import { z } from 'zod';

const preferencesSchema = z.object({
  favoriteCategories: z.array(z.string()).optional(),
  preferredFarms: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  maxDeliveryDistance: z.number().min(0).max(200).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional(),
  notificationSettings: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean()
  }).optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session.user.id);
    case 'PUT':
      return handleUpdate(req, res, session.user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const preferences = await PersonalizationService.getUserPreferences(userId);

    res.status(200).json({
      success: true,
      preferences
    });
  } catch (error) {
    // console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get preferences'
    });
  }
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const validationResult = preferencesSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences data',
        errors: validationResult.error.errors
      });
    }

    const updatedPreferences = await PersonalizationService.updateUserPreferences(
      userId,
      validationResult.data
    );

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    // console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
}