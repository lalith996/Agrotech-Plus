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

  if (session.user.role !== UserRole.CUSTOMER) {
    return res.status(403).json({ message: "Access denied" })
  }

  if (req.method === "GET") {
    try {
      const customer = await prisma.customer.findUnique({
        where: { userId: session.user.id },
      })

      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" })
      }

      // Get active subscription
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          customerId: customer.id,
          status: "ACTIVE"
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Get recent orders
      const recentOrders = await prisma.order.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: true
        }
      })

      // Find next delivery
      const nextDelivery = recentOrders.find(order => 
        new Date(order.deliveryDate) > new Date() && 
        (order.status === "CONFIRMED" || order.status === "PICKED")
      )

      // Calculate sustainability metrics (mock data)
      const sustainabilityMetrics = {
        foodMilesReduced: recentOrders.length * 45, // Average 45km per order
        carbonSaved: recentOrders.length * 2.3, // Average 2.3kg CO2 per order
        ordersCompleted: recentOrders.filter(o => o.status === "DELIVERED").length
      }

      const dashboard = {
        nextDelivery: nextDelivery ? {
          date: nextDelivery.deliveryDate.toISOString(),
          timeSlot: nextDelivery.deliverySlot,
          items: nextDelivery.items.length,
          totalAmount: nextDelivery.totalAmount
        } : null,
        activeSubscription: activeSubscription ? {
          id: activeSubscription.id,
          deliveryDay: activeSubscription.deliveryDay,
          itemCount: activeSubscription.items.length,
          weeklyAmount: activeSubscription.items.reduce((sum, item) => 
            sum + (item.product.basePrice * item.quantity), 0
          ),
          status: activeSubscription.status
        } : null,
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          status: order.status,
          totalAmount: order.totalAmount,
          deliveryDate: order.deliveryDate.toISOString(),
          itemCount: order.items.length
        })),
        sustainabilityMetrics
      }

      res.status(200).json({ dashboard })
    } catch (error) {
      // console.error("Customer dashboard error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}