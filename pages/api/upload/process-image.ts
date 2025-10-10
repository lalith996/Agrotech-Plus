
import { NextApiRequest, NextApiResponse } from "next";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { Writable } from "stream";

// Configure the S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const streamToBuffer = (stream: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: any) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ message: "S3 key is required" });
    }

    const bucketName = process.env.S3_BUCKET_NAME!;

    // 1. Download the original image from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const { Body: originalImageStream, ContentType } = await s3Client.send(getObjectCommand);

    if (!originalImageStream) {
        return res.status(404).json({ message: "Original image not found in S3" });
    }

    const imageBuffer = await streamToBuffer(originalImageStream);

    // 2. Process the image with Sharp
    const optimizedWebPBuffer = await sharp(imageBuffer)
      .webp({ quality: 80 })
      .toBuffer();

    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 200) // 200x200 thumbnail
      .jpeg({ quality: 90 })
      .toBuffer();

    // 3. Upload the processed images back to S3
    const optimizedKey = key.replace(/(\.[^.]+)$/, ".webp");
    const thumbnailKey = key.replace(/(\.[^.]+)$/, "_thumbnail.jpg");

    const putOptimizedCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: optimizedKey,
        Body: optimizedWebPBuffer,
        ContentType: "image/webp",
        // ACL: 'public-read',
    });

    const putThumbnailCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
        // ACL: 'public-read',
    });

    await Promise.all([
        s3Client.send(putOptimizedCommand),
        s3Client.send(putThumbnailCommand),
    ]);
    
    // 4. Construct the final URLs
    const finalOptimizedUrl = `https://${bucketName}.s3.${process.env.S3_REGION}.amazonaws.com/${optimizedKey}`;
    const finalThumbnailUrl = `https://${bucketName}.s3.${process.env.S3_REGION}.amazonaws.com/${thumbnailKey}`;

    res.status(200).json({
        message: "Image processed successfully",
        optimizedUrl: finalOptimizedUrl,
        thumbnailUrl: finalThumbnailUrl,
    });

  } catch (error) {
    // console.error("Error processing image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
