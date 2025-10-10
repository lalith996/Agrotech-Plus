import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, OrderStatus } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  const { id } = req.query

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid order ID" })
  }

  if (req.method === "GET") {
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: {
            include: {
              user: { select: { name: true, email: true } }
            }
          },
          subscription: true,
          address: true,
          items: {
            include: {
              product: {
                include: {
                  farmer: {
                    include: {
                      user: { select: { name: true } }
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!order) {
        return res.status(404).json({ message: "Order not found" })
      }

      // Check access permissions
      if (session.user.role === UserRole.CUSTOMER) {
        const customer = await prisma.customer.findUnique({
          where: { userId: session.user.id },
        })
        if (!customer || order.customerId !== customer.id) {
          return res.status(403).json({ message: "Access denied" })
        }
      }

      res.status(200).json({ order })
    } catch (error) {
      // console.error("Order fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "PUT") {
    try {
      const { status, specialNotes } = req.body

      // Check permissions for status updates
      if (session.user.role === UserRole.CUSTOMER) {
        // Customers can only cancel pending orders
        if (status && status !== OrderStatus.CANCELLED) {
          return res.status(403).json({ message: "Customers can only cancel orders" })
        }
        
        const customer = await prisma.customer.findUnique({
          where: { userId: session.user.id },
        })
        
        const order = await prisma.order.findUnique({
          where: { id },
        })
        
        if (!customer || !order || order.customerId !== customer.id) {
          return res.status(403).json({ message: "Access denied" })
        }
        
        if (order.status !== OrderStatus.PENDING) {
          return res.status(400).json({ message: "Can only cancel pending orders" })
        }
      } else if (session.user.role !== UserRole.ADMIN && 
                 session.user.role !== UserRole.OPERATIONS) {
        return res.status(403).json({ message: "Access denied" })
      }

      const updateData: any = {}
      if (status) updateData.status = status
      if (specialNotes !== undefined) updateData.specialNotes = specialNotes

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            include: {
              user: { select: { name: true, email: true } }
            }
          },
          address: true,
          items: {
            include: {
              product: {
                include: {
                  farmer: {
                    include: {
                      user: { select: { name: true } }
                    }
                  }
                }
              }
            }
          }
        }
      })

      res.status(200).json({
        order: updatedOrder,
        message: "Order updated successfully"
      })
    } catch (error) {
      // console.error("Order update error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}