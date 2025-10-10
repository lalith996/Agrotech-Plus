
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSession } from "next-auth/react";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const {
      originalName,
      mimeType,
      size,
      s3Key,
      url,
      optimizedUrl,
      thumbnailUrl,
    } = req.body;

    if (!originalName || !mimeType || !size || !s3Key || !url) {
      return res.status(400).json({ message: "Missing required file data" });
    }

    const newFile = await prisma.file.create({
      data: {
        originalName,
        mimeType,
        size,
        s3Key,
        url,
        optimizedUrl,
        thumbnailUrl,
        uploadedBy: session.user.id,
      },
    });

    res.status(201).json(newFile);

  } catch (error) {
    // console.error("Error creating file record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
