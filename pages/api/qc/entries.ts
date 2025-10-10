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
      const { farmerDeliveryId, productId, acceptedQuantity, rejectedQuantity, rejectionReasons, notes } = req.body;

      // Basic validation
      if (!farmerDeliveryId || !productId || acceptedQuantity === undefined || rejectedQuantity === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const qcEntry = await prisma.qCResult.create({
        data: {
          farmerDeliveryId,
          productId,
          acceptedQuantity: parseFloat(acceptedQuantity),
          rejectedQuantity: parseFloat(rejectedQuantity),
          rejectionReasons: rejectionReasons || [],
          notes: notes || '',
          inspectorId: session.user.id,
          // You would need to get these from the request or have default values
          farmerId: "clx07o1a3000008l3goun46er", // placeholder
          expectedQuantity: 0, // placeholder
          photos: [], // placeholder
        },
      });
      res.status(201).json(qcEntry);
    } catch (error) {
      // console.error('Error creating QC entry:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
