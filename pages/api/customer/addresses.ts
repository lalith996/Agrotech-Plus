import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addressSchema } from "@/lib/validations"
import { UserRole } from "@prisma/client"
import { geocodeAddress } from "@/lib/geocode";

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

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
  })

  if (!customer) {
    return res.status(404).json({ message: "Customer profile not found" })
  }

  if (req.method === "GET") {
    try {
      const addresses = await prisma.address.findMany({
        where: { customerId: customer.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      })

      res.status(200).json({ addresses })
    } catch (error) {
      // console.error("Addresses fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "POST") {
    try {
      const validatedData = addressSchema.parse({
        ...req.body,
        customerId: customer.id,
      })

      const coordinates = await geocodeAddress(validatedData);
      if (coordinates) {
        validatedData.latitude = coordinates.latitude;
        validatedData.longitude = coordinates.longitude;
      }

      // If setting as default, unset other defaults
      if (validatedData.isDefault) {
        await prisma.address.updateMany({
          where: { customerId: customer.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      const address = await prisma.address.create({
        data: validatedData,
      })

      res.status(201).json({ address, message: "Address created successfully" })
    } catch (error: any) {
      // console.error("Address creation error:", error)
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors })
      }
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "PUT") {
    try {
      const { id, ...updateData } = req.body
      
      if (!id) {
        return res.status(400).json({ message: "Address ID is required" })
      }

      // Verify ownership
      const existingAddress = await prisma.address.findUnique({
        where: { id },
      })

      if (!existingAddress || existingAddress.customerId !== customer.id) {
        return res.status(404).json({ message: "Address not found" })
      }

      const validatedData = addressSchema.parse({
        ...updateData,
        customerId: customer.id,
      })

      const coordinates = await geocodeAddress(validatedData);
      if (coordinates) {
        validatedData.latitude = coordinates.latitude;
        validatedData.longitude = coordinates.longitude;
      }

      // If setting as default, unset other defaults
      if (validatedData.isDefault) {
        await prisma.address.updateMany({
          where: { customerId: customer.id, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }

      const address = await prisma.address.update({
        where: { id },
        data: validatedData,
      })

      res.status(200).json({ address, message: "Address updated successfully" })
    } catch (error: any) {
      // console.error("Address update error:", error)
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors })
      }
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query

      if (!id || typeof id !== "string") {
        return res.status(400).json({ message: "Address ID is required" })
      }

      // Verify ownership
      const existingAddress = await prisma.address.findUnique({
        where: { id },
      })

      if (!existingAddress || existingAddress.customerId !== customer.id) {
        return res.status(404).json({ message: "Address not found" })
      }

      await prisma.address.delete({
        where: { id },
      })

      res.status(200).json({ message: "Address deleted successfully" })
    } catch (error) {
      // console.error("Address deletion error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}
