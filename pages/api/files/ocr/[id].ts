import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OCRService } from '@/lib/ocr-service';
import { prisma } from '@/lib/db-optimization';
import { S3StorageService } from '@/lib/file-upload';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  try {
    // Get file record
    const file = await prisma.file.findFirst({
      where: {
        id,
        uploadedBy: session.user.id
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file is an image or PDF
    if (!file.mimeType.startsWith('image/') && file.mimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'OCR is only supported for images and PDF files' });
    }

    // Check if OCR has already been processed
    const existingOCR = (file.metadata as any)?.ocr;
    if (existingOCR && req.body.force !== true) {
      return res.status(200).json({
        success: true,
        message: 'OCR already processed',
        ocrResult: existingOCR,
        extractedData: (file.metadata as any)?.extractedData
      });
    }

    // Download file from S3
    const fileBuffer = await downloadFileFromS3(file.filename);
    
    // Process with OCR
    const result = await OCRService.processFile(file.id, fileBuffer, file.category);

    res.status(200).json({
      success: true,
      message: 'OCR processing completed',
      ocrResult: result.ocrResult,
      extractedData: result.extractedData
    });

  } catch (error) {
    // console.error('OCR processing error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'OCR processing failed'
    });
  }
}

async function downloadFileFromS3(key: string): Promise<Buffer> {
  // This is a simplified version - in production, you'd use AWS SDK
  // For now, we'll assume the file is accessible via URL
  try {
    const response = await fetch(S3StorageService.getSignedUrl(key));
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    // console.error('File download error:', error);
    throw new Error('Failed to download file for OCR processing');
  }
}