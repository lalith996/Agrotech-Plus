
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const { id } = req.query;

  if (req.method !== "GET" && req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (
    !session ||
    (session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.OPERATIONS)
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  if (req.method === "GET") {
    try {
      const user = await prisma.user.findUnique({
        where: { id: id as string },
        include: {
          customer: {
            include: {
              orders: true,
              subscriptions: true,
            },
          },
          farmer: {
            include: {
              products: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ user });
    } catch (error) {
      // console.error("Admin user fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "PUT") {
    try {
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: id as string },
        data: { role },
      });

      res.status(200).json({ 
        user: updatedUser, 
        message: "User role updated successfully" 
      });

    } catch (error) {
      // console.error("Admin user update error:", error);
      res.status(500).json({ message: "Error updating user role" });
    }
  }
}
