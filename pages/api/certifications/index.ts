import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { paginateWithOffset, sendPaginatedResponse } from "@/lib/pagination";
import { sendUnauthorized, sendForbidden, sendCreated, sendBadRequest, sendMethodNotAllowed, sendInternalError } from "@/lib/api-response";
import { logError, logInfo } from "@/lib/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return sendUnauthorized(res);
  }

  if (session.user.role !== UserRole.FARMER) {
    return sendForbidden(res, "Only farmers can manage certifications");
  }

  // Get farmer profile
  const farmer = await prisma.farmer.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  });

  if (!farmer) {
    return sendForbidden(res, "Farmer profile not found");
  }

  if (req.method === "GET") {
    try {
      const result = await paginateWithOffset(
        prisma.certification,
        req,
        {
          where: { farmerId: farmer.id },
          include: {
            file: true, // Include the associated file details
          },
          orderBy: {
            createdAt: "desc",
          },
          defaultLimit: 20,
          maxLimit: 100,
        }
      );

      return sendPaginatedResponse(res, result);
    } catch (error) {
      return sendInternalError(res, error instanceof Error ? error : new Error(String(error)), {
        farmerId: farmer.id,
        userId: session.user.id,
      });
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
        return sendBadRequest(res, "Missing required fields", {
          required: ["name", "issuingBody", "issueDate", "fileId"],
        });
      }

      const newCertification = await prisma.certification.create({
        data: {
          name,
          issuingBody,
          issueDate: new Date(issueDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          farmerId: farmer.id,
          fileId,
        },
        include: {
          file: true,
        },
      });

      logInfo("Certification created", {
        certificationId: newCertification.id,
        farmerId: farmer.id,
        userId: session.user.id,
      });

      return sendCreated(res, newCertification, "Certification created successfully");
    } catch (error) {
      return sendInternalError(res, error instanceof Error ? error : new Error(String(error)), {
        farmerId: farmer.id,
        userId: session.user.id,
      });
    }
  } else {
    return sendMethodNotAllowed(res, ["GET", "POST"]);
  }
}
