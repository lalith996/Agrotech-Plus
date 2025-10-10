import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SearchEngine, FARMER_FILTERS } from '@/lib/search'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
  filters: z.record(z.any()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  fuzzy: z.boolean().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Check if user has permission to search farmers
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    // Parse and validate query parameters
    const queryParams = {
      query: req.query.query as string,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : {},
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      fuzzy: req.query.fuzzy === 'true'
    }

    const validationResult = searchSchema.safeParse(queryParams)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters',
        errors: validationResult.error.errors
      })
    }

    const searchOptions = validationResult.data

    // Mock farmer data - in production, this would query the database
    const mockFarmers = [
      {
        id: 'farmer-1',
        name: 'Green Valley Farm',
        contactName: 'John Smith',
        email: 'john@greenvalley.com',
        phone: '555-0101',
        status: 'active',
        qualityScore: 8.5,
        deliveryRate: 95,
        location: {
          address: '123 Farm Road',
          city: 'Salinas',
          state: 'CA',
          zipCode: '93901'
        },
        certifications: ['organic', 'gap'],
        specialties: ['tomatoes', 'peppers', 'herbs'],
        totalDeliveries: 145,
        averageRating: 4.7,
        joinedAt: new Date('2023-03-15'),
        lastDelivery: new Date('2024-01-20')
      },
      {
        id: 'farmer-2',
        name: 'Sunny Acres',
        contactName: 'Maria Garcia',
        email: 'maria@sunnyacres.com',
        phone: '555-0102',
        status: 'active',
        qualityScore: 9.2,
        deliveryRate: 98,
        location: {
          address: '456 Sunny Lane',
          city: 'Watsonville',
          state: 'CA',
          zipCode: '95076'
        },
        certifications: ['organic', 'fair-trade'],
        specialties: ['leafy greens', 'root vegetables'],
        totalDeliveries: 203,
        averageRating: 4.9,
        joinedAt: new Date('2023-01-10'),
        lastDelivery: new Date('2024-01-19')
      },
      {
        id: 'farmer-3',
        name: 'Fresh Fields',
        contactName: 'David Johnson',
        email: 'david@freshfields.com',
        phone: '555-0103',
        status: 'inactive',
        qualityScore: 7.8,
        deliveryRate: 87,
        location: {
          address: '789 Field Avenue',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201'
        },
        certifications: ['gap'],
        specialties: ['peppers', 'squash', 'beans'],
        totalDeliveries: 89,
        averageRating: 4.2,
        joinedAt: new Date('2023-06-20'),
        lastDelivery: new Date('2024-01-05')
      },
      {
        id: 'farmer-4',
        name: 'Harvest Hills',
        contactName: 'Sarah Wilson',
        email: 'sarah@harvesthills.com',
        phone: '555-0104',
        status: 'pending',
        qualityScore: 0,
        deliveryRate: 0,
        location: {
          address: '321 Hill Road',
          city: 'Fresno',
          state: 'CA',
          zipCode: '93701'
        },
        certifications: ['organic'],
        specialties: ['fruits', 'berries'],
        totalDeliveries: 0,
        averageRating: 0,
        joinedAt: new Date('2024-01-15'),
        lastDelivery: null
      }
    ]

    // Apply search and filtering
    const searchFields: (keyof typeof mockFarmers[0])[] = ['name', 'contactName', 'email', 'specialties']
    const results = SearchEngine.search(
      mockFarmers,
      searchOptions,
      searchFields,
      FARMER_FILTERS
    )

    return res.status(200).json({
      success: true,
      ...results,
      searchOptions: {
        query: searchOptions.query,
        filters: searchOptions.filters,
        sortBy: searchOptions.sortBy,
        sortOrder: searchOptions.sortOrder,
        fuzzy: searchOptions.fuzzy
      }
    })

  } catch (error) {
    // console.error('Error searching farmers:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}