import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid zone ID" })
  }

  if (req.method === "GET") {
    try {
      const { date } = req.query
      const targetDate = date ? new Date(date as string) : new Date()
      const dayOfWeek = targetDate.getDay()

      // Get available slots for the zone and day
      const slots = await prisma.deliverySlot.findMany({
        where: {
          zoneId: id,
          dayOfWeek,
          isActive: true,
        },
        orderBy: { startTime: "asc" }
      })

      // Check availability for each slot
      const slotsWithAvailability = await Promise.all(
        slots.map(async (slot) => {
          const existingRoutes = await prisma.deliveryRoute.count({
            where: {
              slotId: slot.id,
              date: {
                gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
                lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
              }
            }
          })

          const ordersInSlot = await prisma.order.count({
            where: {
              deliveryDate: {
                gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
                lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
              },
              deliverySlot: `${slot.startTime}-${slot.endTime}`,
            }
          })

          return {
            ...slot,
            availableCapacity: slot.maxOrders - ordersInSlot,
            isAvailable: ordersInSlot < slot.maxOrders,
          }
        })
      )

      res.status(200).json({ slots: slotsWithAvailability })
    } catch (error) {
      // console.error("Delivery slots fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Only admin/operations can create slots
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
      return res.status(403).json({ message: "Access denied" })
    }

    try {
      const { dayOfWeek, startTime, endTime, maxOrders } = req.body

      if (dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({ message: "Day of week, start time, and end time are required" })
      }

      const slot = await prisma.deliverySlot.create({
        data: {
          zoneId: id,
          dayOfWeek: parseInt(dayOfWeek),
          startTime,
          endTime,
          maxOrders: maxOrders || 50,
        },
      })

      res.status(201).json({ slot, message: "Delivery slot created successfully" })
    } catch (error) {
      // console.error("Delivery slot creation error:", error)
      
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return res.status(400).json({ message: "Slot already exists for this time" })
      }
      
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}