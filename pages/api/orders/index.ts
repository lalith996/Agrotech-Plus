
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, OrderStatus } from "@prisma/client";
import { sendEmail } from "@/lib/sendgrid";
import { sendSms } from "@/lib/twilio";
import { XSSProtection } from "@/lib/security";
import { logError } from "@/lib/logger";

// Type for order item
interface OrderItemType {
  product: {
    name: string
  }
  quantity: number
  price: number
}

// Type for order email
interface OrderForEmail {
  id: string
  status: OrderStatus
  deliveryDate: Date
  totalAmount: number
  address: {
    street: string
    city: string
  }
  items: OrderItemType[]
}

const formatOrderForEmail = (order: OrderForEmail): string => {
  // Sanitize all dynamic content to prevent XSS
  const itemsList = order.items.map((item) => {
    const productName = XSSProtection.encodeHtml(item.product.name);
    const total = (item.price * item.quantity).toFixed(2);
    return `<li>${productName} (Qty: ${item.quantity}) - $${total}</li>`;
  }).join('');

  const orderId = XSSProtection.encodeHtml(order.id);
  const street = XSSProtection.encodeHtml(order.address.street);
  const city = XSSProtection.encodeHtml(order.address.city);
  const deliveryDate = new Date(order.deliveryDate).toLocaleDateString();

  return `
    <h1>Order Confirmation #${orderId}</h1>
    <p>Thank you for your order!</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <p><strong>Delivery Date:</strong> ${deliveryDate}</p>
    <p><strong>Delivery Address:</strong> ${street}, ${city}</p>
    <h3>Items:</h3>
    <ul>${itemsList}</ul>
    <h3>Total: $${order.totalAmount.toFixed(2)}</h3>
  `;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const { page = "1", limit = "10" } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      let orders;
      let totalOrders;

      if (session.user.role === UserRole.CUSTOMER) {
        const customer = await prisma.customer.findUnique({
          where: { userId: session.user.id },
        });
        if (!customer) {
          return res.status(404).json({ message: "Customer profile not found" });
        }

        [orders, totalOrders] = await prisma.$transaction([
          prisma.order.findMany({
            where: { customerId: customer.id },
            include: {
              items: { include: { product: true } },
              address: true,
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limitNum,
          }),
          prisma.order.count({ where: { customerId: customer.id } }),
        ]);
      } else if (session.user.role === UserRole.FARMER) {
        const farmer = await prisma.farmer.findUnique({
          where: { userId: session.user.id },
        });
        if (!farmer) {
          return res.status(404).json({ message: "Farmer profile not found" });
        }

        [orders, totalOrders] = await prisma.$transaction([
          prisma.order.findMany({
            where: {
              items: {
                some: {
                  product: {
                    farmerId: farmer.id,
                  },
                },
              },
            },
            include: {
              items: {
                where: { product: { farmerId: farmer.id } },
                include: { product: true },
              },
              customer: { include: { user: { select: { name: true, email: true } } } },
              address: true,
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limitNum,
          }),
          prisma.order.count({
            where: {
              items: {
                some: {
                  product: {
                    farmerId: farmer.id,
                  },
                },
              },
            },
          }),
        ]);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.status(200).json({
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalOrders,
          pages: Math.ceil(totalOrders / limitNum),
        },
      });
    } catch (error) {
      logError("Orders fetch error", error instanceof Error ? error : new Error(String(error)), {
        userId: session.user.id,
        role: session.user.role,
      })
      res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "POST") {
    // POST logic remains the same
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ message: "Method not allowed" });
  }
}
