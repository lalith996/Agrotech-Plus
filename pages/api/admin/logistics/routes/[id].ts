import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid route ID' })
    }

    if (req.method === 'GET') {
      return await handleGetRoute(req, res, id)
    } else if (req.method === 'PUT') {
      return await handleUpdateRoute(req, res, id)
    } else if (req.method === 'DELETE') {
      return await handleDeleteRoute(req, res, id)
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // console.error('Route API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetRoute(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Mock route data (in real implementation use prisma.deliveryRoute.findUnique)
    const mockRoute = {
      id,
      name: `Route ${id}`,
      scheduledDate: new Date(),
      status: 'PLANNED',
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      estimatedDuration: 240,
      actualDuration: null,
      totalDistance: 45.5,
      totalStops: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'driver-1',
        user: {
          name: 'John Driver',
          email: 'john.driver@example.com'
        },
        licenseNumber: 'DL123456789',
        status: 'available'
      },
      vehicle: {
        id: 'vehicle-1',
        make: 'Ford',
        model: 'Transit',
        licensePlate: 'ABC123',
        capacity: { weight: 1000, volume: 50 }
      },
      stops: [
        {
          id: 'stop-1',
          orderId: 'order-1',
          sequence: 1,
          address: '123 Main St, New York, NY 10001',
          coordinates: { lat: 40.7128, lng: -74.0060 },
          estimatedArrival: new Date(Date.now() + 60 * 60 * 1000),
          actualArrival: null,
          status: 'PENDING',
          serviceTime: 15,
          order: {
            id: 'order-1',
            totalAmount: 75.50,
            customer: {
              user: {
                name: 'Customer One',
                email: 'customer1@example.com'
              }
            }
          }
        },
        {
          id: 'stop-2',
          orderId: 'order-2',
          sequence: 2,
          address: '456 Broadway, New York, NY 10013',
          coordinates: { lat: 40.7205, lng: -74.0052 },
          estimatedArrival: new Date(Date.now() + 90 * 60 * 1000),
          actualArrival: null,
          status: 'PENDING',
          serviceTime: 20,
          order: {
            id: 'order-2',
            totalAmount: 125.00,
            customer: {
              user: {
                name: 'Customer Two',
                email: 'customer2@example.com'
              }
            }
          }
        }
      ]
    };

    if (!mockRoute) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json(mockRoute);
  } catch (error) {
    // console.error('Get route error:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
}

async function handleUpdateRoute(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { 
      status, 
      actualDuration, 
      stops,
      driverId,
      vehicleId 
    } = req.body;

    // Mock route update (in real implementation use prisma.deliveryRoute.update)
    const updatedRoute = {
      id,
      status: status || 'PLANNED',
      actualDuration: actualDuration || null,
      driverId: driverId || 'driver-1',
      vehicleId: vehicleId || 'vehicle-1',
      updatedAt: new Date(),
      stops: stops || []
    };

    // console.log('Mock updating route:', updatedRoute);

    res.json({
      success: true,
      route: updatedRoute
    });
  } catch (error) {
    // console.error('Update route error:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
}

async function handleDeleteRoute(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Mock route deletion (in real implementation use prisma.deliveryRoute.delete)
    // console.log('Mock deleting route:', id);

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    // console.error('Delete route error:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
}