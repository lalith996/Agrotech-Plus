import { NextApiRequest, NextApiResponse } from "next"
import { prisma } from "@/lib/prisma"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const farmers = await prisma.farmer.findMany({
        where: {
          isApproved: true
        },
        select: {
          id: true,
          farmName: true,
          location: true,
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })

      res.status(200).json({ farmers })
    } catch (error) {
      // console.error("Public farmers fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}
