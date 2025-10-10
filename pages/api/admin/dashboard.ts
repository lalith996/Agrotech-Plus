import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
    return res.status(403).json({ message: "Access denied" })
  }

  if (req.method === "GET") {
    try {
      // Get current month for revenue calculation
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        totalCustomers,
        totalFarmers,
        pendingFarmers,
        totalProducts,
        activeSubscriptions,
        totalOrders,
        pendingOrders,
        monthlyOrders,
        recentOrders,
        recentFarmers
      ] = await Promise.all([
        // Total customers
        prisma.customer.count(),
        
        // Total farmers
        prisma.farmer.count(),
        
        // Pending farmers
        prisma.farmer.count({
          where: { isApproved: false }
        }),
        
        // Total products
        prisma.product.count({
          where: { isActive: true }
        }),
        
        // Active subscriptions
        prisma.subscription.count({
          where: { status: "ACTIVE" }
        }),
        
        // Total orders
        prisma.order.count(),
        
        // Pending orders
        prisma.order.count({
          where: { status: "PENDING" }
        }),
        
        // Monthly orders for revenue
        prisma.order.findMany({
          where: {
            createdAt: { gte: startOfMonth },
            status: { in: ["DELIVERED", "CONFIRMED", "PICKED", "ORDER_IN_TRANSIT"] }
          },
          select: { totalAmount: true }
        }),
        
        // Recent orders
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            customer: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        }),
        
        // Recent farmers
        prisma.farmer.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            farmName: true,
            isApproved: true,
            createdAt: true,
          }
        })
      ])

      // Calculate monthly revenue
      const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0)

      const stats = {
        totalCustomers,
        totalFarmers,
        pendingFarmers,
        totalProducts,
        activeSubscriptions,
        totalOrders,
        pendingOrders,
        monthlyRevenue,
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          customerName: order.customer.user.name || "Unknown",
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        })),
        recentFarmers: recentFarmers.map(farmer => ({
          id: farmer.id,
          farmName: farmer.farmName,
          isApproved: farmer.isApproved,
          createdAt: farmer.createdAt.toISOString(),
        }))
      }

      res.status(200).json({ stats })
    } catch (error) {
      // console.error("Admin dashboard error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}