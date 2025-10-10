import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SearchEngine, QC_RESULT_FILTERS } from '@/lib/search'
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

    // Check if user has permission to search QC results
    if (session.user.role !== UserRole.ADMIN && 
        session.user.role !== UserRole.OPERATIONS && 
        session.user.role !== UserRole.FARMER) {
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

    // Mock QC results data - in production, this would query the database
    const mockQCResults = [
      {
        id: 'qc-1',
        deliveryId: 'delivery-1',
        farmer: {
          id: 'farmer-1',
          name: 'Green Valley Farm'
        },
        product: {
          id: 'product-1',
          name: 'Organic Tomatoes'
        },
        expectedQuantity: 100,
        actualQuantity: 95,
        acceptedQuantity: 90,
        rejectedQuantity: 5,
        acceptanceRate: 90,
        rejectionReasons: ['size_inconsistency'],
        qualityScore: 8.5,
        notes: 'Some tomatoes were smaller than expected but overall good quality',
        inspectedBy: 'QC Inspector 1',
        inspectedAt: new Date('2024-01-20T10:30:00Z'),
        photos: ['qc-photo-1.jpg', 'qc-photo-2.jpg'],
        createdAt: new Date('2024-01-20T10:30:00Z')
      },
      {
        id: 'qc-2',
        deliveryId: 'delivery-2',
        farmer: {
          id: 'farmer-2',
          name: 'Sunny Acres'
        },
        product: {
          id: 'product-2',
          name: 'Fresh Spinach'
        },
        expectedQuantity: 50,
        actualQuantity: 52,
        acceptedQuantity: 50,
        rejectedQuantity: 2,
        acceptanceRate: 96,
        rejectionReasons: ['quality_degradation'],
        qualityScore: 9.2,
        notes: 'Excellent quality spinach, minor wilting on a few leaves',
        inspectedBy: 'QC Inspector 2',
        inspectedAt: new Date('2024-01-19T14:15:00Z'),
        photos: ['qc-photo-3.jpg'],
        createdAt: new Date('2024-01-19T14:15:00Z')
      },
      {
        id: 'qc-3',
        deliveryId: 'delivery-3',
        farmer: {
          id: 'farmer-1',
          name: 'Green Valley Farm'
        },
        product: {
          id: 'product-3',
          name: 'Bell Peppers'
        },
        expectedQuantity: 75,
        actualQuantity: 70,
        acceptedQuantity: 65,
        rejectedQuantity: 5,
        acceptanceRate: 87,
        rejectionReasons: ['pest_damage', 'size_inconsistency'],
        qualityScore: 7.8,
        notes: 'Some peppers showed signs of pest damage, size variation noted',
        inspectedBy: 'QC Inspector 1',
        inspectedAt: new Date('2024-01-18T09:45:00Z'),
        photos: ['qc-photo-4.jpg', 'qc-photo-5.jpg', 'qc-photo-6.jpg'],
        createdAt: new Date('2024-01-18T09:45:00Z')
      },
      {
        id: 'qc-4',
        deliveryId: 'delivery-4',
        farmer: {
          id: 'farmer-3',
          name: 'Fresh Fields'
        },
        product: {
          id: 'product-4',
          name: 'Organic Carrots'
        },
        expectedQuantity: 60,
        actualQuantity: 58,
        acceptedQuantity: 55,
        rejectedQuantity: 3,
        acceptanceRate: 92,
        rejectionReasons: ['overripe'],
        qualityScore: 8.7,
        notes: 'Good quality carrots, a few were overripe',
        inspectedBy: 'QC Inspector 2',
        inspectedAt: new Date('2024-01-17T11:20:00Z'),
        photos: ['qc-photo-7.jpg'],
        createdAt: new Date('2024-01-17T11:20:00Z')
      }
    ]

    // Filter QC results based on user role
    let filteredResults = mockQCResults
    if (session.user.role === UserRole.FARMER) {
      // Farmers can only see their own QC results
      filteredResults = mockQCResults.filter(result => result.farmer.id === session.user.id)
    }

    // Apply search and filtering
    const searchFields = ['farmer.name', 'product.name', 'rejectionReasons', 'notes']
    const results = SearchEngine.search(
      filteredResults,
      searchOptions,
      searchFields as any,
      QC_RESULT_FILTERS
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
    // console.error('Error searching QC results:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}