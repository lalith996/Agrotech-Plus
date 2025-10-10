
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSession } from "next-auth/react";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Assuming the user is a farmer and their farmer ID is stored in the session
  // You might need to adjust this based on your actual session structure
  const farmerId = session.user?.farmer?.id;

  if (!farmerId) {
    return res.status(403).json({ message: "Forbidden: User is not a farmer" });
  }

  if (req.method === "GET") {
    try {
      const certifications = await prisma.certification.findMany({
        where: { farmerId },
        include: {
          file: true, // Include the associated file details
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.status(200).json(certifications);
    } catch (error) {
      // console.error("Error fetching certifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "POST") {
    try {
      const {
        name,
        issuingBody,
        issueDate,
        expiryDate,
        fileId, // The ID of the uploaded file
      } = req.body;

      if (!name || !issuingBody || !issueDate || !fileId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const newCertification = await prisma.certification.create({
        data: {
          name,
          issuingBody,
          issueDate: new Date(issueDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          farmerId,
          fileId,
        },
        include: {
          file: true,
        },
      });

      res.status(201).json(newCertification);
    } catch (error) {
      // console.error("Error creating certification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
