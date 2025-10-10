import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session || session.user.role !== 'FARMER') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      const farmer = await prisma.farmer.findUnique({
        where: { userId },
      });
      if (!farmer) {
        return res.status(404).json({ message: 'Farmer not found' });
      }
      res.status(200).json(farmer);
    } catch (error) {
      // console.error('Error fetching farmer data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { farmName, location, description, phone } = req.body;
      const updatedFarmer = await prisma.farmer.update({
        where: { userId },
        data: {
          farmName,
          location,
          description,
          phone,
        },
      });
      res.status(200).json(updatedFarmer);
    } catch (error) {
      // console.error('Error updating farmer data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
