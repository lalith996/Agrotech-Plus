
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSession } from "next-auth/react";
import { runOcrOnImage } from "@/lib/ocr-service"; // Assuming this is the path to your OCR service

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid certification ID" });
  }

  try {
    // 1. Find the certification and its associated file
    const certification = await prisma.certification.findUnique({
      where: { id },
      include: { file: true },
    });

    if (!certification) {
      return res.status(404).json({ message: "Certification not found" });
    }

    // Check if the user is authorized to run OCR on this certification
    // (e.g., they are the farmer who owns it)
    if (certification.farmerId !== session.user.farmer?.id) {
        return res.status(403).json({ message: "Forbidden" });
    }

    if (!certification.file?.url) {
      return res.status(400).json({ message: "No file associated with this certification" });
    }

    // 2. Run the OCR process
    const text = await runOcrOnImage(certification.file.url);

    // 3. Update the certification with the extracted text
    const updatedCertification = await prisma.certification.update({
      where: { id },
      data: { extractedText: text },
    });

    res.status(200).json(updatedCertification);

  } catch (error) {
    // console.error(`Error running OCR for certification ${id}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
}
