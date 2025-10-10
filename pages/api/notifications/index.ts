import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
      // Mock notifications for demonstration
      const mockNotifications = [
        {
          id: "notif-001",
          userId: session.user.id,
          type: "success" as const,
          title: "Order Delivered",
          message: "Your order #ABC123 has been delivered successfully.",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          actionUrl: "/orders/abc123"
        },
        {
          id: "notif-002", 
          userId: session.user.id,
          type: "info" as const,
          title: "Subscription Updated",
          message: "Your weekly subscription has been updated with new preferences.",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          actionUrl: "/subscriptions"
        },
        {
          id: "notif-003",
          userId: session.user.id,
          type: "warning" as const,
          title: "Delivery Reminder",
          message: "Your next delivery is scheduled for tomorrow between 9 AM - 12 PM.",
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        }
      ]

      res.status(200).json({ notifications: mockNotifications })
    } catch (error) {
      // console.error("Notifications fetch error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else if (req.method === "PUT") {
    try {
      const { notificationId, read } = req.body

      // In a real system, update the notification in the database
      // console.log(`Marking notification ${notificationId} as ${read ? 'read' : 'unread'}`)

      res.status(200).json({ message: "Notification updated successfully" })
    } catch (error) {
      // console.error("Notification update error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}