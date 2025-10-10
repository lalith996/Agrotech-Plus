
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

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (
    !session ||
    (session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.OPERATIONS)
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const { search, role } = req.query;
    const whereClause: any = {};

    if (search && typeof search === "string") {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && typeof role === "string" && role !== "ALL") {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        farmer: true,
      },
    });

    res.status(200).json({ users });
  } catch (error) {
    // console.error("Admin users fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
