import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subscriptionSchema } from "@/lib/validations"
import { UserRole, SubscriptionStatus } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  if (req.method === "GET") {
    try {
      // Only customers can view their subscriptions
      if (session.user.role !== UserRole.CUSTOMER) {
        return res.status(403).json({ message: "Access denied" })
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: session.user.id },
      })

      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" })
      }

      const subscriptions = await prisma.subscription.findMany({
        where: { customerId: customer.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  farmer: {
                    include: {
                      user: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })

      res.status(200).json({ subscriptions })
    } catch (error) {
      // console.error("Subscriptions fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "POST") {
    try {
      // Only customers can create subscriptions
      if (session.user.role !== UserRole.CUSTOMER) {
        return res.status(403).json({ message: "Access denied" })
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: session.user.id },
      })

      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" })
      }

      const body = subscriptionSchema.parse(req.body)

      // Create subscription with items in a transaction
      const subscription = await prisma.$transaction(async (tx) => {
        const newSubscription = await tx.subscription.create({
          data: {
            customerId: customer.id,
            deliveryZone: body.deliveryZone,
            deliveryDay: body.deliveryDay,
            status: body.status,
            startDate: body.startDate,
            pausedUntil: body.pausedUntil,
          },
        })

        // Create subscription items
        await tx.subscriptionItem.createMany({
          data: body.items.map((item) => ({
            subscriptionId: newSubscription.id,
            productId: item.productId,
            quantity: item.quantity,
            frequency: item.frequency,
          })),
        })

        return newSubscription
      })

      // Fetch the complete subscription with items
      const completeSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  farmer: {
                    include: {
                      user: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })

      res.status(201).json({
        subscription: completeSubscription,
        message: "Subscription created successfully",
      })
    } catch (error) {
      // console.error("Subscription creation error:", error)

      if (error instanceof Error) {
        return res.status(400).json({ message: error.message })
      }

      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}