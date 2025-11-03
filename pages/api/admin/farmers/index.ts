import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"
import { HTTP_STATUS, ApiErrorCode, createErrorResponse } from "@/types/api"
import { logError } from "@/lib/logger"
import { sanitizeSearchQuery } from "@/lib/query-validation"

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

      // Sanitize search query
      const searchQuery = sanitizeSearchQuery(search)

      const whereClause: Prisma.FarmerWhereInput = {}

      if (searchQuery) {
        whereClause.OR = [
          { farmName: { contains: searchQuery, mode: "insensitive" } },
          { location: { contains: searchQuery, mode: "insensitive" } },
          { user: { name: { contains: searchQuery, mode: "insensitive" } } },
          { user: { email: { contains: searchQuery, mode: "insensitive" } } },
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
      logError("Admin farmers fetch error", error instanceof Error ? error : new Error(String(error)), {
        method: req.method,
        userId: session.user.id,
      })
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          ApiErrorCode.DATABASE_ERROR,
          "Failed to fetch farmers"
        )
      )
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}