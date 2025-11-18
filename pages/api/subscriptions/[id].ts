import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, SubscriptionStatus } from "@prisma/client"
import { logError } from "@/lib/logger"

// Type for subscription item update
interface SubscriptionItemInput {
  productId: string
  quantity: number
  frequency?: string
}

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
    return res.status(400).json({ message: "Invalid subscription ID" })
  }

  // Only customers can manage their subscriptions
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
      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          customerId: customer.id,
        },
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

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" })
      }

      res.status(200).json({ subscription })
    } catch (error) {
      logError("Subscription fetch error", error instanceof Error ? error : new Error(String(error)), {
        subscriptionId: id,
        customerId: customer.id,
      })
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "PUT") {
    try {
      const { action, ...updateData } = req.body

      // Verify subscription belongs to customer
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          id,
          customerId: customer.id,
        },
      })

      if (!existingSubscription) {
        return res.status(404).json({ message: "Subscription not found" })
      }

      let updatedSubscription

      if (action === "pause") {
        const { pausedUntil } = updateData
        if (!pausedUntil) {
          return res.status(400).json({ message: "pausedUntil date is required" })
        }

        updatedSubscription = await prisma.subscription.update({
          where: { id },
          data: {
            status: SubscriptionStatus.PAUSED,
            pausedUntil: new Date(pausedUntil),
          },
        })
      } else if (action === "resume") {
        updatedSubscription = await prisma.subscription.update({
          where: { id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            pausedUntil: null,
          },
        })
      } else if (action === "cancel") {
        updatedSubscription = await prisma.subscription.update({
          where: { id },
          data: {
            status: SubscriptionStatus.CANCELLED,
          },
        })
      } else if (action === "update") {
        // Update subscription details
        const { deliveryZone, deliveryDay, items } = updateData

        updatedSubscription = await prisma.$transaction(async (tx) => {
          // Update subscription
          const subscription = await tx.subscription.update({
            where: { id },
            data: {
              deliveryZone,
              deliveryDay,
            },
          })

          // Update items if provided
          if (items && Array.isArray(items)) {
            // Delete existing items
            await tx.subscriptionItem.deleteMany({
              where: { subscriptionId: id },
            })

            // Create new items
            await tx.subscriptionItem.createMany({
              data: (items as SubscriptionItemInput[]).map((item) => ({
                subscriptionId: id,
                productId: item.productId,
                quantity: item.quantity,
                frequency: item.frequency || "weekly",
              })),
            })
          }

          return subscription
        })
      } else {
        return res.status(400).json({ message: "Invalid action" })
      }

      // Fetch updated subscription with items
      const completeSubscription = await prisma.subscription.findUnique({
        where: { id },
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

      res.status(200).json({
        subscription: completeSubscription,
        message: "Subscription updated successfully",
      })
    } catch (error) {
      logError("Subscription update error", error instanceof Error ? error : new Error(String(error)), {
        subscriptionId: id,
        customerId: customer.id,
        action: req.body.action,
      })

      if (error instanceof Error) {
        return res.status(400).json({ message: error.message })
      }

      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "DELETE") {
    try {
      // Verify subscription belongs to customer
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          id,
          customerId: customer.id,
        },
      })

      if (!existingSubscription) {
        return res.status(404).json({ message: "Subscription not found" })
      }

      // Soft delete by setting status to cancelled
      await prisma.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CANCELLED,
        },
      })

      res.status(200).json({ message: "Subscription cancelled successfully" })
    } catch (error) {
      logError("Subscription deletion error", error instanceof Error ? error : new Error(String(error)), {
        subscriptionId: id,
        customerId: customer.id,
      })
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}