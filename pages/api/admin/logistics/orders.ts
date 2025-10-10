import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    const { date } = req.query
    const deliveryDate = date ? new Date(date as string) : new Date()
    
    // Set date range for the selected day
    const startOfDay = new Date(deliveryDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(deliveryDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch orders for the selected date
    const orders = await prisma.order.findMany({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['CONFIRMED', 'PICKED', 'ORDER_IN_TRANSIT']
        }
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },

        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true
              }
            }
          }
        },

      },
      orderBy: {
        deliveryDate: 'asc'
      }
    })

    // Transform orders to delivery order format
    const deliveryOrders = orders.map(order => {
      // Calculate estimated delivery duration based on items and distance
      const baseTime = 15 // Base 15 minutes per delivery
      const itemTime = order.items.length * 2 // 2 minutes per item
      const estimatedDuration = baseTime + itemTime

      // Determine priority based on delivery window and order value
      let priority: 'high' | 'medium' | 'low' = 'medium'
      if (order.totalAmount > 100) priority = 'high'
      else if (order.totalAmount < 50) priority = 'low'

      // Determine status based on order status
      let status: 'pending' | 'assigned' | 'in_transit' | 'delivered' = 'pending'
      switch (order.status) {
        case 'CONFIRMED':
          status = 'assigned'
          break
        case 'PICKED':
        case 'ORDER_IN_TRANSIT':
          status = 'in_transit'
          break
        case 'DELIVERED':
          status = 'delivered'
          break
        default:
          status = 'pending'
      }

      return {
        id: order.id,
        customerName: order.customer.user.name || 'Unknown Customer',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        items: order.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit
        })),
        deliveryWindow: {
          start: '09:00',
          end: '17:00'
        },
        priority,
        status,
        estimatedDuration,
        routeId: null,
        routeName: null
      }
    })

    return res.status(200).json({
      success: true,
      orders: deliveryOrders
    })

  } catch (error) {
    // console.error('Error fetching delivery orders:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}