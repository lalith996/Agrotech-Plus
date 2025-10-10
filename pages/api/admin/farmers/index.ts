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
      const { search, status } = req.query

      const whereClause: any = {}

      if (search) {
        whereClause.OR = [
          { farmName: { contains: search as string, mode: "insensitive" } },
          { location: { contains: search as string, mode: "insensitive" } },
          { user: { name: { contains: search as string, mode: "insensitive" } } },
          { user: { email: { contains: search as string, mode: "insensitive" } } },
        ]
      }

      if (status === "approved") {
        whereClause.isApproved = true
      } else if (status === "pending") {
        whereClause.isApproved = false
      }

      const farmers = await prisma.farmer.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          },
          products: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" }
          },
          _count: {
            select: {
              products: true,
              deliveries: true,
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })

      res.status(200).json({ farmers })
    } catch (error) {
      // console.error("Admin farmers fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}