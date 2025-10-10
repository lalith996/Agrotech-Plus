import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const zones = await prisma.deliveryZone.findMany({
        where: { isActive: true },
        include: {
          slots: {
            where: { isActive: true },
            orderBy: [
              { dayOfWeek: "asc" },
              { startTime: "asc" }
            ]
          }
        },
        orderBy: { name: "asc" }
      })

      res.status(200).json({ zones })
    } catch (error) {
      // console.error("Delivery zones fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Only admin/operations can create zones
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
      return res.status(403).json({ message: "Access denied" })
    }

    try {
      const { name, description, boundaries } = req.body

      if (!name) {
        return res.status(400).json({ message: "Zone name is required" })
      }

      const zone = await prisma.deliveryZone.create({
        data: {
          name,
          description,
          boundaries,
        },
      })

      res.status(201).json({ zone, message: "Delivery zone created successfully" })
    } catch (error) {
      // console.error("Delivery zone creation error:", error)
      
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return res.status(400).json({ message: "Zone name already exists" })
      }
      
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}