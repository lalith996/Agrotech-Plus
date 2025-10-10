import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db-optimization'
import { UserRole } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Check if user has permission to access QC interface
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    // Fetch pending deliveries that need QC inspection
    const deliveries = await prisma.farmerDelivery.findMany({
      where: {
        status: 'DELIVERED',
        qcResults: {
          none: {} // No QC results yet
        }
      },
      include: {
        farmer: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        qcResults: true
      },
      orderBy: {
        deliveryDate: 'asc'
      }
    })

    // Transform to QC inspection format
    const inspections = deliveries.map(delivery => ({
      id: delivery.id,
      farmerDeliveryId: delivery.id,
      productId: null, // Will be set when QC is performed
      productName: 'Pending QC', // Will be set when QC is performed
      farmerName: delivery.farmer.user.name || 'Unknown Farmer',
      farmName: delivery.farmer.farmName || 'Unknown Farm',
      expectedQuantity: 0, // Will be set when QC is performed
      unit: 'kg', // Default unit
      deliveryDate: delivery.deliveryDate.toISOString(),
      status: delivery.qcResults.length > 0 ? 'completed' : 'pending'
    }))

    return res.status(200).json({
      success: true,
      inspections
    })

  } catch (error) {
    // console.error('Error fetching QC inspections:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}