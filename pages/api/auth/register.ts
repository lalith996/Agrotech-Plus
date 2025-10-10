import { NextApiRequest, NextApiResponse } from "next"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signUpSchema } from "@/lib/validations"
import { UserRole } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const body = signUpSchema.parse(req.body)
    const { name, email, password, role, farmName, location, phone } = body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create base user
      const user = await tx.user.create({
        data: {
          name,
          email,
          role,
        },
      })

      // Create role-specific profile
      if (role === UserRole.CUSTOMER) {
        await tx.customer.create({
          data: {
            userId: user.id,
            phone,
          },
        })
      } else if (role === UserRole.FARMER) {
        if (!farmName || !location) {
          throw new Error("Farm name and location are required for farmers")
        }
        await tx.farmer.create({
          data: {
            userId: user.id,
            farmName,
            location,
            phone,
            isApproved: false, // Farmers need admin approval
          },
        })
      }

      return user
    })

    // Return user without sensitive data
    const { id, name: userName, email: userEmail, role: userRole } = result
    res.status(201).json({
      user: { id, name: userName, email: userEmail, role: userRole },
      message: "User created successfully",
    })
  } catch (error) {
    // console.error("Registration error:", error)
    
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message })
    }
    
    res.status(500).json({ message: "Internal server error" })
  }
}