import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { getFarmerCommissionRate } from "@/lib/config"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  if (session.user.role !== UserRole.FARMER) {
    return res.status(403).json({ message: "Access denied" })
  }

  if (req.method === "GET") {
    try {
      const farmer = await prisma.farmer.findUnique({
        where: { userId: session.user.id },
      })

      if (!farmer) {
        return res.status(404).json({ message: "Farmer profile not found" })
      }

      // Get current date for monthly calculations
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Fetch dashboard statistics
      const [
        totalProducts,
        activeProducts,
        totalDeliveries,
        pendingDeliveries,
        upcomingDeliveries,
        recentQCResults,
        monthlyOrders,
        allOrderItems,
        recentOrders,
        products
      ] = await Promise.all([
        // Total products
        prisma.product.count({
          where: { farmerId: farmer.id }
        }),
        
        // Active products
        prisma.product.count({
          where: { farmerId: farmer.id, isActive: true }
        }),
        
        // Total deliveries
        prisma.farmerDelivery.count({
          where: { farmerId: farmer.id }
        }),
        
        // Pending deliveries
        prisma.farmerDelivery.count({
          where: { 
            farmerId: farmer.id,
            status: "scheduled",
            deliveryDate: { gte: now }
          }
        }),
        
        // Upcoming deliveries (next 7 days)
        prisma.farmerDelivery.findMany({
          where: {
            farmerId: farmer.id,
            deliveryDate: {
              gte: now,
              lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { deliveryDate: "asc" },
          take: 5
        }),
        
        // Recent QC results (last 10)
        prisma.qCResult.findMany({
          where: { farmerId: farmer.id },
          include: {
            product: { select: { name: true } }
          },
          orderBy: { timestamp: "desc" },
          take: 10
        }),
        
        // Monthly orders for revenue calculation
        prisma.orderItem.findMany({
          where: {
            product: { farmerId: farmer.id },
            order: {
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth
              },
              status: { in: ["DELIVERED", "CONFIRMED", "PICKED", "ORDER_IN_TRANSIT"] }
            }
          },
          include: {
            order: true
          }
        }),

        // All order items for total revenue
        prisma.orderItem.findMany({
          where: {
            product: { farmerId: farmer.id },
            order: {
              status: { in: ["DELIVERED", "CONFIRMED", "PICKED", "ORDER_IN_TRANSIT"] }
            }
          },
          include: {
            order: true
          }
        }),

        // Recent orders (last 5)
        prisma.order.findMany({
          where: {
            items: {
              some: {
                product: { farmerId: farmer.id }
              }
            }
          },
          include: {
            items: {
              where: {
                product: { farmerId: farmer.id }
              },
              include: {
                product: { select: { name: true } }
              }
            },
            customer: {
              include: {
                user: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 5
        }),

        // Products for performance chart
        prisma.product.findMany({
          where: { farmerId: farmer.id },
          select: {
            id: true,
            name: true
          }
        })
      ])

      // Calculate average QC score
      const qcScores = recentQCResults.map(result => {
        const total = result.acceptedQuantity + result.rejectedQuantity
        return total > 0 ? (result.acceptedQuantity / total) * 100 : 0
      })
      const averageQCScore = qcScores.length > 0 
        ? qcScores.reduce((sum, score) => sum + score, 0) / qcScores.length 
        : 0

      // Get farmer commission rate from configuration
      const commissionRate = await getFarmerCommissionRate()

      // Calculate monthly revenue using configured commission rate
      const monthlyRevenue = monthlyOrders.reduce((total, item) => {
        return total + (item.price * item.quantity * commissionRate)
      }, 0)

      // Calculate total revenue (all time)
      const totalRevenue = allOrderItems.reduce((total, item) => {
        return total + (item.price * item.quantity * commissionRate)
      }, 0)

      // Count active orders
      const activeOrdersCount = await prisma.order.count({
        where: {
          items: {
            some: {
              product: { farmerId: farmer.id }
            }
          },
          status: { in: ["PENDING", "CONFIRMED", "PICKED", "ORDER_IN_TRANSIT"] }
        }
      })

      // Calculate product performance efficiently (fixed N+1 query)
      const productIds = products.map(p => p.id)
      const salesByProduct = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          order: {
            status: { in: ["DELIVERED", "CONFIRMED", "PICKED", "ORDER_IN_TRANSIT"] }
          }
        },
        _sum: {
          quantity: true
        }
      })

      // Create lookup map for O(1) access
      const salesMap = new Map(
        salesByProduct.map(item => [item.productId, item._sum.quantity || 0])
      )

      // Map products to performance data
      const productPerformance = products.map(product => ({
        name: product.name,
        sales: salesMap.get(product.id) || 0
      }))

      const stats = {
        farmName: farmer.farmName,
        totalProducts,
        activeProducts,
        activeOrders: activeOrdersCount,
        totalRevenue,
        monthlyRevenue,
        totalDeliveries,
        pendingDeliveries,
        averageQCScore,
        upcomingDeliveries: upcomingDeliveries.map(delivery => ({
          id: delivery.id,
          deliveryDate: delivery.deliveryDate.toISOString(),
          status: delivery.status,
          notes: delivery.notes,
        })),
        recentQCResults: recentQCResults.map(result => ({
          id: result.id,
          productName: result.product.name,
          acceptedQuantity: result.acceptedQuantity,
          rejectedQuantity: result.rejectedQuantity,
          timestamp: result.timestamp.toISOString(),
          rejectionReasons: result.rejectionReasons,
        })),
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          customerName: order.customer.user.name,
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          items: order.items.map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price
          }))
        })),
        productPerformance: productPerformance.sort((a, b) => b.sales - a.sales).slice(0, 5)
      }

      res.status(200).json({ stats })
    } catch (error) {
      // console.error("Farmer dashboard error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}