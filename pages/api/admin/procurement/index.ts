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
      // Mock procurement lists for demonstration
      // In a real system, this would be stored in the database
      const mockLists = [
        {
          id: "proc-001",
          date: new Date().toISOString(),
          status: "draft" as const,
          totalItems: 8,
          totalFarmers: 5,
          items: [
            {
              productId: "prod-001",
              productName: "Fresh Spinach",
              totalQuantity: 50,
              unit: "bunches",
              farmers: [
                {
                  farmerId: "farmer-001",
                  farmerName: "Ravi Kumar",
                  farmName: "Green Valley Farm",
                  assignedQuantity: 30,
                  capacity: 40,
                },
                {
                  farmerId: "farmer-002", 
                  farmerName: "Priya Sharma",
                  farmName: "Sunrise Organic",
                  assignedQuantity: 20,
                  capacity: 25,
                }
              ]
            },
            {
              productId: "prod-002",
              productName: "Organic Tomatoes",
              totalQuantity: 25,
              unit: "kg",
              farmers: [
                {
                  farmerId: "farmer-001",
                  farmerName: "Ravi Kumar", 
                  farmName: "Green Valley Farm",
                  assignedQuantity: 15,
                  capacity: 20,
                },
                {
                  farmerId: "farmer-003",
                  farmerName: "Suresh Patel",
                  farmName: "Heritage Farms",
                  assignedQuantity: 10,
                  capacity: 15,
                }
              ]
            }
          ]
        }
      ]

      res.status(200).json({ lists: mockLists })
    } catch (error) {
      // console.error("Procurement lists fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}