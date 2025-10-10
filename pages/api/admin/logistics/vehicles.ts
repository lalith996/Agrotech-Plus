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
      return await handleGetVehicles(req, res)
    } else if (req.method === 'POST') {
      return await handleCreateVehicle(req, res)
    } else if (req.method === 'PUT') {
      return await handleUpdateVehicle(req, res)
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // console.error('Vehicles API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetVehicles(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Mock vehicles data (in real implementation use prisma.vehicle.findMany)
    const vehicles = [
      {
        id: 'vehicle-1',
        make: 'Ford',
        model: 'Transit',
        year: 2022,
        licensePlate: 'ABC123',
        vin: '1FTBW2CM5NKA12345',
        capacity: {
          weight: 1000, // kg
          volume: 50 // cubic meters
        },
        fuelType: 'diesel',
        status: 'available',
        mileage: 45000,
        lastMaintenanceDate: new Date('2024-01-15'),
        nextMaintenanceDate: new Date('2024-04-15'),
        insuranceExpiryDate: new Date('2024-12-31'),
        registrationExpiryDate: new Date('2024-11-30'),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
        currentLocation: {
          lat: 40.7589,
          lng: -73.9851
        },
        assignedDriver: {
          id: 'driver-1',
          user: {
            name: 'John Driver',
            email: 'john.driver@example.com'
          },
          licenseNumber: 'DL123456789'
        },
        currentRoute: {
          id: 'route-1',
          name: 'Downtown Route A',
          status: 'IN_PROGRESS',
          estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
        },
        maintenanceHistory: [
          {
            id: 'maint-1',
            type: 'routine',
            description: 'Oil change and tire rotation',
            date: new Date('2024-01-15'),
            cost: 150.00,
            mileage: 44500
          }
        ]
      },
      {
        id: 'vehicle-2',
        make: 'Mercedes',
        model: 'Sprinter',
        year: 2023,
        licensePlate: 'XYZ789',
        vin: '1FTBW2CM5NKA67890',
        capacity: {
          weight: 800,
          volume: 40
        },
        fuelType: 'diesel',
        status: 'in_use',
        mileage: 28000,
        lastMaintenanceDate: new Date('2024-02-01'),
        nextMaintenanceDate: new Date('2024-05-01'),
        insuranceExpiryDate: new Date('2024-12-31'),
        registrationExpiryDate: new Date('2024-10-31'),
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date(),
        currentLocation: {
          lat: 40.7505,
          lng: -73.9934
        },
        assignedDriver: {
          id: 'driver-2',
          user: {
            name: 'Jane Delivery',
            email: 'jane.delivery@example.com'
          },
          licenseNumber: 'DL987654321'
        },
        currentRoute: {
          id: 'route-2',
          name: 'Uptown Route B',
          status: 'IN_PROGRESS',
          estimatedCompletion: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour from now
        },
        maintenanceHistory: [
          {
            id: 'maint-2',
            type: 'repair',
            description: 'Brake pad replacement',
            date: new Date('2024-02-01'),
            cost: 280.00,
            mileage: 27500
          }
        ]
      },
      {
        id: 'vehicle-3',
        make: 'Honda',
        model: 'CB500X',
        year: 2023,
        licensePlate: 'BIKE456',
        vin: 'JH2PC4505NK123456',
        capacity: {
          weight: 50,
          volume: 2
        },
        fuelType: 'gasoline',
        status: 'maintenance',
        mileage: 15000,
        lastMaintenanceDate: new Date('2024-02-20'),
        nextMaintenanceDate: new Date('2024-05-20'),
        insuranceExpiryDate: new Date('2024-12-31'),
        registrationExpiryDate: new Date('2024-09-30'),
        createdAt: new Date('2023-08-01'),
        updatedAt: new Date(),
        currentLocation: {
          lat: 40.7589,
          lng: -73.9851
        },
        assignedDriver: {
          id: 'driver-3',
          user: {
            name: 'Mike Quick',
            email: 'mike.quick@example.com'
          },
          licenseNumber: 'DL456789123'
        },
        currentRoute: null,
        maintenanceHistory: [
          {
            id: 'maint-3',
            type: 'routine',
            description: 'Chain and sprocket replacement',
            date: new Date('2024-02-20'),
            cost: 120.00,
            mileage: 14800
          }
        ]
      }
    ];

    // Calculate summary statistics
    const stats = {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      inUse: vehicles.filter(v => v.status === 'in_use').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      totalCapacity: {
        weight: vehicles.reduce((sum, v) => sum + v.capacity.weight, 0),
        volume: vehicles.reduce((sum, v) => sum + v.capacity.volume, 0)
      },
      averageMileage: vehicles.reduce((sum, v) => sum + v.mileage, 0) / vehicles.length,
      upcomingMaintenance: vehicles.filter(v => 
        v.nextMaintenanceDate && v.nextMaintenanceDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ).length
    };

    res.json({
      vehicles,
      stats
    });
  } catch (error) {
    // console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
}

async function handleCreateVehicle(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      make, 
      model, 
      year, 
      licensePlate, 
      vin, 
      capacity, 
      fuelType 
    } = req.body;

    // Validate required fields
    if (!make || !model || !year || !licensePlate || !vin || !capacity) {
      return res.status(400).json({ 
        error: 'Missing required fields: make, model, year, licensePlate, vin, capacity' 
      });
    }

    // Mock vehicle creation (in real implementation use prisma.vehicle.create)
    const newVehicle = {
      id: `vehicle_${Date.now()}`,
      make,
      model,
      year,
      licensePlate,
      vin,
      capacity,
      fuelType: fuelType || 'diesel',
      status: 'available',
      mileage: 0,
      createdAt: new Date()
    };

    // console.log('Mock creating vehicle:', newVehicle);

    res.status(201).json({
      success: true,
      vehicle: newVehicle
    });
  } catch (error) {
    // console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
}

async function handleUpdateVehicle(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      vehicleId, 
      status, 
      mileage, 
      currentLocation, 
      assignedDriverId 
    } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'Vehicle ID is required' });
    }

    // Mock vehicle update (in real implementation use prisma.vehicle.update)
    const updatedVehicle = {
      id: vehicleId,
      status: status || 'available',
      mileage: mileage || 0,
      currentLocation: currentLocation || null,
      assignedDriverId: assignedDriverId || null,
      updatedAt: new Date()
    };

    // console.log('Mock updating vehicle:', updatedVehicle);

    res.json({
      success: true,
      vehicle: updatedVehicle
    });
  } catch (error) {
    // console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
}