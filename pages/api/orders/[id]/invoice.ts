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

      // Generate invoice data
      const invoice = {
        invoiceNumber: `INV-${order.id.slice(-8).toUpperCase()}`,
        date: order.createdAt,
        dueDate: order.deliveryDate,
        customer: {
          name: order.customer.user.name,
          email: order.customer.user.email,
          address: {
            street: order.address.street,
            city: order.address.city,
            state: order.address.state,
            zipCode: order.address.zipCode,
          }
        },
        items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit,
          unitPrice: item.price,
          total: item.price * item.quantity,
          farmer: item.product.farmer.user.name,
        })),
        subtotal: order.totalAmount,
        tax: 0, // No tax for now
        total: order.totalAmount,
        deliverySlot: order.deliverySlot,
        deliveryDate: order.deliveryDate,
        status: order.status,
      }

      res.status(200).json({ invoice })
    } catch (error) {
      // console.error("Invoice generation error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}