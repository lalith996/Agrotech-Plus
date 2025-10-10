import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SearchEngine, ORDER_FILTERS } from '@/lib/search'
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

    // Filter orders based on user role
    let orderFilter = {}
    if (session.user.role === UserRole.CUSTOMER) {
      orderFilter = { customerId: session.user.id }
    }
    // Admin and Operations can see all orders

    // Mock order data - in production, this would query the database
    const mockOrders = [
      {
        id: 'order-1',
        orderNumber: 'ORD-2024-001',
        customerId: 'customer-1',
        customer: {
          name: 'Alice Johnson',
          email: 'alice@example.com'
        },
        status: 'delivered',
        total: 45.99,
        deliveryDate: new Date('2024-01-20'),
        deliveryZone: 'zone-1',
        items: [
          { productName: 'Organic Tomatoes', quantity: 2, price: 4.99 },
          { productName: 'Fresh Spinach', quantity: 3, price: 3.49 }
        ],
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: 'order-2',
        orderNumber: 'ORD-2024-002',
        customerId: 'customer-2',
        customer: {
          name: 'Bob Smith',
          email: 'bob@example.com'
        },
        status: 'out_for_delivery',
        total: 67.50,
        deliveryDate: new Date('2024-01-21'),
        deliveryZone: 'zone-2',
        items: [
          { productName: 'Bell Peppers', quantity: 1, price: 5.99 },
          { productName: 'Organic Carrots', quantity: 4, price: 2.99 }
        ],
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-21')
      },
      {
        id: 'order-3',
        orderNumber: 'ORD-2024-003',
        customerId: 'customer-3',
        customer: {
          name: 'Carol Davis',
          email: 'carol@example.com'
        },
        status: 'preparing',
        total: 32.75,
        deliveryDate: new Date('2024-01-22'),
        deliveryZone: 'zone-1',
        items: [
          { productName: 'Mixed Greens', quantity: 2, price: 4.49 },
          { productName: 'Organic Tomatoes', quantity: 1, price: 4.99 }
        ],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-21')
      },
      {
        id: 'order-4',
        orderNumber: 'ORD-2024-004',
        customerId: 'customer-1',
        customer: {
          name: 'Alice Johnson',
          email: 'alice@example.com'
        },
        status: 'confirmed',
        total: 89.25,
        deliveryDate: new Date('2024-01-23'),
        deliveryZone: 'zone-3',
        items: [
          { productName: 'Organic Carrots', quantity: 3, price: 2.99 },
          { productName: 'Fresh Spinach', quantity: 5, price: 3.49 }
        ],
        createdAt: new Date('2024-01-21'),
        updatedAt: new Date('2024-01-21')
      }
    ]

    // Filter orders based on user permissions
    let filteredOrders = mockOrders
    if (session.user.role === UserRole.CUSTOMER) {
      filteredOrders = mockOrders.filter(order => order.customerId === session.user.id)
    }

    // Apply search and filtering
    const searchFields = ['orderNumber', 'customer.name', 'customer.email', 'status']
    const results = SearchEngine.search(
      filteredOrders,
      searchOptions,
      searchFields as any,
      ORDER_FILTERS
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
    // console.error('Error searching orders:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}