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
      return await handleGetDrivers(req, res)
    } else if (req.method === 'POST') {
      return await handleCreateDriver(req, res)
    } else if (req.method === 'PUT') {
      return await handleUpdateDriver(req, res)
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // console.error('Drivers API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetDrivers(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Mock drivers data (in real implementation use prisma.driver.findMany)
    const drivers = [
      {
        id: 'driver-1',
        licenseNumber: 'DL123456789',
        vehicleType: 'truck',
        status: 'available',
        currentLocation: {
          lat: 40.7128,
          lng: -74.0060
        },
        createdAt: new Date('2024-01-01'),
        user: {
          id: 'user-1',
          name: 'John Driver',
          email: 'john.driver@example.com',
          phone: '+1234567890'
        },
        vehicle: {
          id: 'vehicle-1',
          make: 'Ford',
          model: 'Transit',
          year: 2022,
          licensePlate: 'ABC123',
          capacity: 1000
        },
        currentRoute: null,
        deliveriesCompleted: 45,
        rating: 4.8
      },
      {
        id: 'driver-2',
        licenseNumber: 'DL987654321',
        vehicleType: 'van',
        status: 'on_route',
        currentLocation: {
          lat: 40.7589,
          lng: -73.9851
        },
        createdAt: new Date('2024-01-15'),
        user: {
          id: 'user-2',
          name: 'Jane Delivery',
          email: 'jane.delivery@example.com',
          phone: '+1234567891'
        },
        vehicle: {
          id: 'vehicle-2',
          make: 'Mercedes',
          model: 'Sprinter',
          year: 2023,
          licensePlate: 'XYZ789',
          capacity: 800
        },
        currentRoute: {
          id: 'route-1',
          name: 'Downtown Route',
          estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
        },
        deliveriesCompleted: 32,
        rating: 4.6
      },
      {
        id: 'driver-3',
        licenseNumber: 'DL456789123',
        vehicleType: 'motorcycle',
        status: 'offline',
        currentLocation: {
          lat: 40.7505,
          lng: -73.9934
        },
        createdAt: new Date('2024-02-01'),
        user: {
          id: 'user-3',
          name: 'Mike Quick',
          email: 'mike.quick@example.com',
          phone: '+1234567892'
        },
        vehicle: {
          id: 'vehicle-3',
          make: 'Honda',
          model: 'CB500X',
          year: 2023,
          licensePlate: 'BIKE456',
          capacity: 50
        },
        currentRoute: null,
        deliveriesCompleted: 78,
        rating: 4.9
      }
    ];

    // Calculate summary statistics
    const stats = {
      total: drivers.length,
      available: drivers.filter(d => d.status === 'available').length,
      onRoute: drivers.filter(d => d.status === 'on_route').length,
      offline: drivers.filter(d => d.status === 'offline').length,
      averageRating: drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length,
      totalDeliveries: drivers.reduce((sum, d) => sum + d.deliveriesCompleted, 0)
    };

    res.json({
      drivers,
      stats
    });
  } catch (error) {
    // console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
}

async function handleCreateDriver(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      userId, 
      licenseNumber, 
      vehicleType, 
      vehicleDetails 
    } = req.body;

    // Validate required fields
    if (!userId || !licenseNumber || !vehicleType) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, licenseNumber, vehicleType' 
      });
    }

    // Mock driver creation (in real implementation use prisma.driver.create)
    const newDriver = {
      id: `driver-${Date.now()}`,
      licenseNumber,
      vehicleType,
      status: 'available',
      currentLocation: null,
      createdAt: new Date(),
      userId,
      deliveriesCompleted: 0,
      rating: 5.0
    };

    // console.log('Mock creating driver:', newDriver);

    res.status(201).json({
      success: true,
      driver: newDriver
    });
  } catch (error) {
    // console.error('Create driver error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
}

async function handleUpdateDriver(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      driverId, 
      status, 
      currentLocation, 
      vehicleDetails 
    } = req.body;

    if (!driverId) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }

    // Mock driver update (in real implementation use prisma.driver.update)
    const updatedDriver = {
      id: driverId,
      status: status || 'available',
      currentLocation: currentLocation || null,
      updatedAt: new Date()
    };

    // console.log('Mock updating driver:', updatedDriver);

    res.json({
      success: true,
      driver: updatedDriver
    });
  } catch (error) {
    // console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
}