import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (req.method === 'GET') {
      return await handleGetRoutes(req, res)
    } else if (req.method === 'POST') {
      return await handleCreateRoute(req, res)
    } else if (req.method === 'PUT') {
      return await handleUpdateRoute(req, res)
    } else if (req.method === 'DELETE') {
      return await handleDeleteRoute(req, res)
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // console.error('Routes API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetRoutes(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date, status, driverId } = req.query

    // Mock routes data (in real implementation use prisma.deliveryRoute.findMany)
    const mockRoutes = [
      {
        id: 'route-1',
        name: 'Downtown Route A',
        scheduledDate: new Date(),
        status: 'PLANNED',
        driverId: 'driver-1',
        vehicleId: 'vehicle-1',
        estimatedDuration: 240, // 4 hours in minutes
        actualDuration: null,
        totalDistance: 45.5, // km
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
            estimatedArrival: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
            actualArrival: null,
            status: 'PENDING',
            serviceTime: 15 // minutes
          },
          {
            id: 'stop-2',
            orderId: 'order-2',
            sequence: 2,
            address: '456 Broadway, New York, NY 10013',
            coordinates: { lat: 40.7205, lng: -74.0052 },
            estimatedArrival: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
            actualArrival: null,
            status: 'PENDING',
            serviceTime: 20
          }
        ]
      },
      {
        id: 'route-2',
        name: 'Uptown Route B',
        scheduledDate: new Date(),
        status: 'IN_PROGRESS',
        driverId: 'driver-2',
        vehicleId: 'vehicle-2',
        estimatedDuration: 180,
        actualDuration: null,
        totalDistance: 32.8,
        totalStops: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
        driver: {
          id: 'driver-2',
          user: {
            name: 'Jane Delivery',
            email: 'jane.delivery@example.com'
          },
          licenseNumber: 'DL987654321',
          status: 'on_route'
        },
        vehicle: {
          id: 'vehicle-2',
          make: 'Mercedes',
          model: 'Sprinter',
          licensePlate: 'XYZ789',
          capacity: { weight: 800, volume: 40 }
        },
        stops: [
          {
            id: 'stop-3',
            orderId: 'order-3',
            sequence: 1,
            address: '789 5th Ave, New York, NY 10022',
            coordinates: { lat: 40.7614, lng: -73.9776 },
            estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
            actualArrival: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
            status: 'COMPLETED',
            serviceTime: 10
          }
        ]
      }
    ];

    // Apply filters
    let filteredRoutes = mockRoutes;

    if (date) {
      const filterDate = new Date(date as string);
      filteredRoutes = filteredRoutes.filter(route => 
        route.scheduledDate.toDateString() === filterDate.toDateString()
      );
    }

    if (status) {
      filteredRoutes = filteredRoutes.filter(route => route.status === status);
    }

    if (driverId) {
      filteredRoutes = filteredRoutes.filter(route => route.driverId === driverId);
    }

    // Calculate summary statistics
    const summary = {
      total: filteredRoutes.length,
      planned: filteredRoutes.filter(r => r.status === 'PLANNED').length,
      inProgress: filteredRoutes.filter(r => r.status === 'IN_PROGRESS').length,
      completed: filteredRoutes.filter(r => r.status === 'COMPLETED').length,
      totalStops: filteredRoutes.reduce((sum, r) => sum + r.totalStops, 0),
      totalDistance: filteredRoutes.reduce((sum, r) => sum + r.totalDistance, 0),
      averageStopsPerRoute: filteredRoutes.length > 0 
        ? filteredRoutes.reduce((sum, r) => sum + r.totalStops, 0) / filteredRoutes.length 
        : 0
    };

    res.json({
      routes: filteredRoutes,
      summary
    });
  } catch (error) {
    // console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
}

async function handleCreateRoute(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      name, 
      scheduledDate, 
      driverId, 
      vehicleId, 
      stops 
    } = req.body;

    // Validate required fields
    if (!name || !scheduledDate || !driverId || !vehicleId || !stops) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, scheduledDate, driverId, vehicleId, stops' 
      });
    }

    // Mock route creation (in real implementation use prisma.deliveryRoute.create)
    const newRoute = {
      id: `route_${Date.now()}`,
      name,
      scheduledDate: new Date(scheduledDate),
      status: 'PLANNED',
      driverId,
      vehicleId,
      estimatedDuration: stops.length * 30, // 30 minutes per stop
      totalDistance: stops.length * 5, // 5 km per stop (rough estimate)
      totalStops: stops.length,
      createdAt: new Date(),
      stops: stops.map((stop: any, index: number) => ({
        ...stop,
        id: `stop_${Date.now()}_${index}`,
        sequence: index + 1,
        status: 'PENDING'
      }))
    };

    // console.log('Mock creating route:', newRoute);

    res.status(201).json({
      success: true,
      route: newRoute
    });
  } catch (error) {
    // console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
}

async function handleUpdateRoute(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      routeId, 
      status, 
      actualDuration, 
      stops 
    } = req.body;

    if (!routeId) {
      return res.status(400).json({ error: 'Route ID is required' });
    }

    // Mock route update (in real implementation use prisma.deliveryRoute.update)
    const updatedRoute = {
      id: routeId,
      status: status || 'PLANNED',
      actualDuration: actualDuration || null,
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

async function handleDeleteRoute(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { routeId } = req.body;

    if (!routeId) {
      return res.status(400).json({ error: 'Route ID is required' });
    }

    // Mock route deletion (in real implementation use prisma.deliveryRoute.delete)
    // console.log('Mock deleting route:', routeId);

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    // console.error('Delete route error:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
}