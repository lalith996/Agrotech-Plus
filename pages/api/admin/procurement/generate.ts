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

  if (req.method === "POST") {
    try {
      const { date } = req.body
      const targetDate = new Date(date)

      // Get all active subscriptions that should deliver on this date
      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          // In a real system, you'd filter by delivery day matching the target date
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  farmer: {
                    include: {
                      user: { select: { name: true } }
                    }
                  }
                }
              }
            }
          }
        }
      })

      // Aggregate requirements by product
      const productRequirements = new Map()

      subscriptions.forEach(subscription => {
        subscription.items.forEach(item => {
          const productId = item.product.id
          const existing = productRequirements.get(productId) || {
            productId,
            productName: item.product.name,
            unit: item.product.unit,
            totalQuantity: 0,
            farmers: new Map()
          }

          existing.totalQuantity += item.quantity

          // Add to farmer's assignment
          const farmerId = item.product.farmer.id
          const farmerData = existing.farmers.get(farmerId) || {
            farmerId,
            farmerName: item.product.farmer.user.name,
            farmName: item.product.farmer.farmName,
            assignedQuantity: 0,
            capacity: 100 // Mock capacity
          }

          farmerData.assignedQuantity += item.quantity
          existing.farmers.set(farmerId, farmerData)
          productRequirements.set(productId, existing)
        })
      })

      // Convert to array format
      const procurementItems = Array.from(productRequirements.values()).map(item => ({
        ...item,
        farmers: Array.from(item.farmers.values())
      }))

      // In a real system, you'd save this to the database
      const procurementList = {
        id: `proc-${Date.now()}`,
        date: targetDate.toISOString(),
        status: "draft" as const,
        items: procurementItems,
        totalItems: procurementItems.length,
        totalFarmers: new Set(procurementItems.flatMap(item => 
          item.farmers.map((f: any) => f.farmerId)
        )).size
      }

      res.status(201).json({
        list: procurementList,
        message: "Procurement list generated successfully"
      })
    } catch (error) {
      // console.error("Procurement generation error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}