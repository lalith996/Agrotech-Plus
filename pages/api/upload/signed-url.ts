
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authOptions } from "@/lib/auth";
import { nanoid } from "nanoid";

// Configure the S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ message: "Filename and contentType are required" });
    }

    // Generate a unique key for the S3 object
    const key = `${session.user.id}/${nanoid()}/${filename}`;
    const bucketName = process.env.S3_BUCKET_NAME!;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      // ACL: 'public-read', // Uncomment if you want the objects to be publicly readable by default
    });

    // Generate the pre-signed URL
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });
    
    // Construct the final URL of the object after upload
    const finalUrl = `https://${bucketName}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

    res.status(200).json({ signedUrl, url: finalUrl, key });

  } catch (error) {
    // console.error("Error generating signed URL:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
