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

      // Get farmer deliveries with mock product requirements
      // In a real system, this would be based on aggregated subscription orders
      const deliveries = await prisma.farmerDelivery.findMany({
        where: { 
          farmerId: farmer.id,
          deliveryDate: { gte: new Date() }
        },
        orderBy: { deliveryDate: "asc" }
      })

      // Mock product requirements for each delivery
      const deliveriesWithProducts = await Promise.all(
        deliveries.map(async (delivery) => {
          // Get farmer's products to simulate requirements
          const products = await prisma.product.findMany({
            where: { 
              farmerId: farmer.id,
              isActive: true
            },
            take: 3 // Simulate 3 products per delivery
          })

          return {
            id: delivery.id,
            deliveryDate: delivery.deliveryDate.toISOString(),
            status: delivery.status,
            notes: delivery.notes,
            products: products.map(product => ({
              id: product.id,
              name: product.name,
              requiredQuantity: Math.floor(Math.random() * 20) + 5, // Mock quantity
              unit: product.unit,
              specifications: `Grade A quality, ${product.description?.slice(0, 50)}...`
            }))
          }
        })
      )

      res.status(200).json({ deliveries: deliveriesWithProducts })
    } catch (error) {
      // console.error("Farmer deliveries fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}