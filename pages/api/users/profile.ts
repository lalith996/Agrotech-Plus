import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateProfileSchema, updateFarmerProfileSchema } from "@/lib/validations"
import { UserRole } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const userId = session.user.id

  if (req.method === "GET") {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          customer: {
            include: {
              addresses: true,
            },
          },
          farmer: {
            include: {
              certifications: true,
            },
          },
        },
      })

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      res.status(200).json({ user })
    } catch (error) {
      // console.error("Profile fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "PUT") {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { farmer: true, customer: true },
      })

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      if (user.role === UserRole.CUSTOMER) {
        const body = updateProfileSchema.parse(req.body)
        
        const updatedUser = await prisma.$transaction(async (tx) => {
          // Update base user
          const user = await tx.user.update({
            where: { id: userId },
            data: { name: body.name },
          })

          // Update customer profile
          await tx.customer.update({
            where: { userId },
            data: { phone: body.phone },
          })

          return user
        })

        res.status(200).json({ 
          user: updatedUser,
          message: "Profile updated successfully" 
        })
      } else if (user.role === UserRole.FARMER) {
        const body = updateFarmerProfileSchema.parse(req.body)
        
        const updatedUser = await prisma.$transaction(async (tx) => {
          // Update base user
          const user = await tx.user.update({
            where: { id: userId },
            data: { name: body.farmName }, // Use farm name as display name
          })

          // Update farmer profile
          await tx.farmer.update({
            where: { userId },
            data: {
              farmName: body.farmName,
              location: body.location,
              description: body.description,
              phone: body.phone,
            },
          })

          return user
        })

        res.status(200).json({ 
          user: updatedUser,
          message: "Profile updated successfully" 
        })
      } else {
        // For admin/operations users, just update basic info
        const body = updateProfileSchema.parse(req.body)
        
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { name: body.name },
        })

        res.status(200).json({ 
          user: updatedUser,
          message: "Profile updated successfully" 
        })
      }
    } catch (error) {
      // console.error("Profile update error:", error)
      
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message })
      }
      
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}