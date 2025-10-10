import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries)) {
        return res.status(400).json({ message: 'Invalid request body' });
      }

      const createPromises = entries.map(entry => {
        const { farmerDeliveryId, productId, acceptedQuantity, rejectedQuantity, rejectionReasons, notes } = entry;
        
        // Basic validation for each entry
        if (!farmerDeliveryId || !productId || acceptedQuantity === undefined || rejectedQuantity === undefined) {
          // You might want to handle this more gracefully, e.g., by logging the error and skipping the entry
          // console.error('Skipping invalid entry:', entry);
          return null; // or continue to the next iteration
        }

        return prisma.qCResult.create({
          data: {
            farmerDeliveryId,
            productId,
            acceptedQuantity: parseFloat(acceptedQuantity),
            rejectedQuantity: parseFloat(rejectedQuantity),
            rejectionReasons: rejectionReasons || [],
            notes: notes || '',
            inspectorId: session.user.id,
            farmerId: "clx07o1a3000008l3goun46er", // placeholder
            expectedQuantity: 0, // placeholder
            photos: [], // placeholder
          },
        });
      }).filter(Boolean); // Filter out any null entries

      if (createPromises.length > 0) {
        await Promise.all(createPromises);
      }
      
      res.status(200).json({ message: 'Sync successful' });
    } catch (error) {
      // console.error('Error syncing QC entries:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(4_05).end(`Method ${req.method} Not Allowed`);
  }
}
