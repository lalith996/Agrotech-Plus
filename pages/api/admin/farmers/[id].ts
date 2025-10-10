
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

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.OPERATIONS
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid farmer ID" });
  }

  if (req.method === "GET") {
    try {
      const farmer = await prisma.farmer.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              createdAt: true,
            },
          },
          products: {
            orderBy: { createdAt: "desc" },
          },
          certifications: true,
        },
      });

      if (!farmer) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      res.status(200).json({ farmer });
    } catch (error) {
      // console.error("Admin farmer fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "PUT") {
    try {
      const { isApproved } = req.body;

      if (typeof isApproved !== 'boolean') {
        return res.status(400).json({ message: "Invalid approval status" });
      }

      const updatedFarmer = await prisma.farmer.update({
        where: { id },
        data: { isApproved },
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      // Here you might trigger an email notification to the farmer
      // e.g., await sendEmail(...) 

      res.status(200).json({
        farmer: updatedFarmer,
        message: `Farmer has been successfully ${isApproved ? "approved" : "unapproved"}.`,
      });

    } catch (error) {
      // console.error("Farmer update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT"]);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
