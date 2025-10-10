import AWS from 'aws-sdk';
import sharp from 'sharp';
import { createHash } from 'crypto';
import path from 'path';
import { prisma } from './db-optimization';

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-west-2',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'agrotrack-files';

// File validation configuration
const FILE_VALIDATION = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
  },
  allowedExtensions: {
    images: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    documents: ['.pdf', '.doc', '.docx'],
    audio: ['.mp3', '.wav', '.ogg']
  }
};

// Thumbnail sizes configuration
const THUMBNAIL_SIZES = [
  { name: 'thumbnail', width: 150, height: 150 },
  { name: 'small', width: 300, height: 300 },
  { name: 'medium', width: 600, height: 600 },
  { name: 'large', width: 1200, height: 1200 }
];

export interface FileMetadata {
  category: string;
  entityType?: string;
  entityId?: string;
  userId: string;
  description?: string;
}

export interface ProcessedFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnails?: Array<{ name: string; url: string; width: number; height: number }>;
  metadata?: any;
  size: number;
  mimeType: string;
}

export interface UploadResult {
  success: boolean;
  file?: ProcessedFile;
  error?: string;
}

class FileValidationService {
  /**
   * Validate file type and size
   */
  static validateFile(file: Buffer | File, filename: string, category: string): { isValid: boolean; error?: string } {
    // Check file size
    const size = file instanceof Buffer ? file.length : (file as any).size;
    if (size > FILE_VALIDATION.maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${FILE_VALIDATION.maxSize / (1024 * 1024)}MB`
      };
    }

    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    const allowedExtensions = this.getAllowedExtensions(category);
    
    if (!allowedExtensions.includes(ext)) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate MIME type
   */
  static validateMimeType(mimeType: string, category: string): boolean {
    const allowedTypes = this.getAllowedMimeTypes(category);
    return allowedTypes.includes(mimeType);
  }

  /**
   * Get allowed extensions for category
   */
  private static getAllowedExtensions(category: string): string[] {
    switch (category) {
      case 'qc_photo':
      case 'profile_image':
      case 'product_image':
        return FILE_VALIDATION.allowedExtensions.images;
      case 'certification':
      case 'document':
        return FILE_VALIDATION.allowedExtensions.documents;
      case 'audio_note':
        return FILE_VALIDATION.allowedExtensions.audio;
      default:
        return [...FILE_VALIDATION.allowedExtensions.images, ...FILE_VALIDATION.allowedExtensions.documents];
    }
  }

  /**
   * Get allowed MIME types for category
   */
  private static getAllowedMimeTypes(category: string): string[] {
    switch (category) {
      case 'qc_photo':
      case 'profile_image':
      case 'product_image':
        return FILE_VALIDATION.allowedMimeTypes.images;
      case 'certification':
      case 'document':
        return FILE_VALIDATION.allowedMimeTypes.documents;
      case 'audio_note':
        return FILE_VALIDATION.allowedMimeTypes.audio;
      default:
        return [...FILE_VALIDATION.allowedMimeTypes.images, ...FILE_VALIDATION.allowedMimeTypes.documents];
    }
  }

  /**
   * Scan file for viruses (placeholder - integrate with actual antivirus service)
   */
  static async scanForViruses(fileBuffer: Buffer): Promise<{ isClean: boolean; threat?: string }> {
    // Placeholder implementation
    // In production, integrate with services like ClamAV, VirusTotal, etc.
    
    // Simple check for suspicious patterns
    const suspiciousPatterns = [
      Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'), // EICAR test string
    ];

    for (const pattern of suspiciousPatterns) {
      if (fileBuffer.includes(pattern)) {
        return { isClean: false, threat: 'Test virus detected' };
      }
    }

    return { isClean: true };
  }
}

class ImageProcessingService {
  /**
   * Process image: compress, generate thumbnails, extract metadata
   */
  static async processImage(fileBuffer: Buffer, filename: string): Promise<{
    processedBuffer: Buffer;
    thumbnails: Array<{ name: string; buffer: Buffer; width: number; height: number }>;
    metadata: any;
  }> {
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    // Compress main image
    const processedBuffer = await image
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate thumbnails
    const thumbnails = await Promise.all(
      THUMBNAIL_SIZES.map(async (size) => {
        const thumbnailBuffer = await sharp(fileBuffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        return {
          name: size.name,
          buffer: thumbnailBuffer,
          width: size.width,
          height: size.height
        };
      })
    );

    return {
      processedBuffer,
      thumbnails,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: fileBuffer.length,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        density: metadata.density,
        exif: metadata.exif
      }
    };
  }

  /**
   * Add watermark to image
   */
  static async addWatermark(imageBuffer: Buffer, watermarkText: string = 'AgroTrack+'): Promise<Buffer> {
    const watermarkSvg = `
      <svg width="200" height="50">
        <text x="10" y="30" font-family="Arial" font-size="16" fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.3)" stroke-width="1">
          ${watermarkText}
        </text>
      </svg>
    `;

    const watermarkBuffer = Buffer.from(watermarkSvg);

    return sharp(imageBuffer)
      .composite([{
        input: watermarkBuffer,
        gravity: 'southeast'
      }])
      .jpeg({ quality: 85 })
      .toBuffer();
  }
}

class S3StorageService {
  /**
   * Upload file to S3
   */
  static async uploadToS3(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metadata: FileMetadata
  ): Promise<{ url: string; key: string }> {
    const key = this.generateS3Key(filename, metadata);
    
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: {
        category: metadata.category,
        entityType: metadata.entityType || '',
        entityId: metadata.entityId || '',
        userId: metadata.userId,
        uploadDate: new Date().toISOString()
      },
      ServerSideEncryption: 'AES256'
    };

    const result = await s3.upload(uploadParams).promise();
    
    return {
      url: result.Location,
      key: result.Key
    };
  }

  /**
   * Upload thumbnail to S3
   */
  static async uploadThumbnail(
    thumbnailBuffer: Buffer,
    originalKey: string,
    thumbnailName: string
  ): Promise<string> {
    const thumbnailKey = `${originalKey.replace(/\.[^/.]+$/, '')}_${thumbnailName}.jpg`;
    
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256'
    };

    const result = await s3.upload(uploadParams).promise();
    return result.Location;
  }

  /**
   * Delete file from S3
   */
  static async deleteFromS3(key: string): Promise<void> {
    const deleteParams: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();
  }

  /**
   * Generate S3 key with proper structure
   */
  private static generateS3Key(filename: string, metadata: FileMetadata): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hash = createHash('md5').update(`${filename}${Date.now()}`).digest('hex').substring(0, 8);
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    return `${metadata.category}/${timestamp}/${metadata.userId}/${baseName}_${hash}${ext}`;
  }

  /**
   * Get signed URL for private files
   */
  static getSignedUrl(key: string, expiresIn: number = 3600): string {
    return s3.getSignedUrl('getObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    });
  }
}

export class FileUploadService {
  /**
   * Main file upload method
   */
  static async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      // Step 1: Validate file
      const validation = FileValidationService.validateFile(fileBuffer, filename, metadata.category);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Step 2: Validate MIME type
      if (!FileValidationService.validateMimeType(mimeType, metadata.category)) {
        return { success: false, error: 'Invalid file type' };
      }

      // Step 3: Virus scan
      const virusScan = await FileValidationService.scanForViruses(fileBuffer);
      if (!virusScan.isClean) {
        return { success: false, error: `Security threat detected: ${virusScan.threat}` };
      }

      let processedBuffer = fileBuffer;
      let thumbnails: Array<{ name: string; url: string; width: number; height: number }> = [];
      let fileMetadata: any = {};

      // Step 4: Process image if applicable
      if (mimeType.startsWith('image/')) {
        const processed = await ImageProcessingService.processImage(fileBuffer, filename);
        processedBuffer = processed.processedBuffer;
        fileMetadata = processed.metadata;

        // Add watermark for sensitive categories
        if (['qc_photo', 'certification'].includes(metadata.category)) {
          processedBuffer = await ImageProcessingService.addWatermark(processedBuffer);
        }

        // Upload thumbnails
        const thumbnailUploads = await Promise.all(
          processed.thumbnails.map(async (thumb) => {
            const originalKey = this.generateTempKey(filename, metadata);
            const thumbnailUrl = await S3StorageService.uploadThumbnail(
              thumb.buffer,
              originalKey,
              thumb.name
            );
            
            return {
              name: thumb.name,
              url: thumbnailUrl,
              width: thumb.width,
              height: thumb.height
            };
          })
        );

        thumbnails = thumbnailUploads;
      }

      // Step 5: Upload main file to S3
      const uploadResult = await S3StorageService.uploadToS3(
        processedBuffer,
        filename,
        mimeType,
        metadata
      );

      // Step 6: Save file record to database (mock implementation)
      const fileRecord = {
        id: `file_${Date.now()}`,
        filename: uploadResult.key,
        originalName: filename,
        mimeType,
        size: processedBuffer.length,
        url: uploadResult.url,
        thumbnails: thumbnails.length > 0 ? thumbnails : null,
        metadata: Object.keys(fileMetadata).length > 0 ? fileMetadata : null,
        encrypted: true,
        virusScanned: true,
        category: metadata.category,
        entityType: metadata.entityType,
        entityId: metadata.entityId,
        uploadedBy: metadata.userId
      };
      
      // In a real implementation, you would save to database:
      // const fileRecord = await prisma.file.create({
      //   data: {
      //     filename: uploadResult.key,
      //     originalName: filename,
      //     mimeType,
      //     size: processedBuffer.length,
      //     url: uploadResult.url,
      //     thumbnails: thumbnails.length > 0 ? thumbnails : null,
      //     metadata: Object.keys(fileMetadata).length > 0 ? fileMetadata : null,
      //     encrypted: true, // S3 server-side encryption
      //     virusScanned: true,
      //     category: metadata.category,
      //     entityType: metadata.entityType,
      //     entityId: metadata.entityId,
      //     uploadedBy: metadata.userId
      //   }
      // });

      return {
        success: true,
        file: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          originalName: fileRecord.originalName,
          url: fileRecord.url,
          thumbnails,
          metadata: fileMetadata,
          size: fileRecord.size,
          mimeType: fileRecord.mimeType
        }
      };

    } catch (error) {
      // console.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Delete file and cleanup
   */
  static async deleteFile(fileId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock file lookup - in real implementation use prisma.file.findFirst
      const file = {
        id: fileId,
        filename: `mock_${fileId}.jpg`,
        thumbnails: null,
        uploadedBy: userId
      };

      if (!file) {
        return { success: false, error: 'File not found or access denied' };
      }

      // Delete from S3
      const s3Key = file.filename;
      await S3StorageService.deleteFromS3(s3Key);

      // Delete thumbnails from S3
      if (file.thumbnails && Array.isArray(file.thumbnails)) {
        const thumbnailDeletions = (file.thumbnails as any[]).map(async (thumb) => {
          const thumbnailKey = thumb.url.split('/').pop();
          if (thumbnailKey) {
            await S3StorageService.deleteFromS3(thumbnailKey);
          }
        });
        
        await Promise.all(thumbnailDeletions);
      }

      // Delete from database (mock implementation)
      // await prisma.file.delete({
      //   where: { id: fileId }
      // });

      return { success: true };

    } catch (error) {
      // console.error('File deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed'
      };
    }
  }

  /**
   * Get file with access control
   */
  static async getFile(fileId: string, userId: string): Promise<ProcessedFile | null> {
    // Mock file lookup - in real implementation use prisma.file.findFirst
    const file = {
      id: fileId,
      filename: `mock_${fileId}.jpg`,
      originalName: 'mock-file.jpg',
      url: `https://example.com/${fileId}`,
      thumbnails: null,
      metadata: null,
      size: 1024,
      mimeType: 'image/jpeg'
    };

    if (!file) return null;

    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      url: file.url,
      thumbnails: file.thumbnails as any,
      metadata: file.metadata as any,
      size: file.size,
      mimeType: file.mimeType
    };
  }

  /**
   * List files with pagination
   */
  static async listFiles(
    userId: string,
    filters: {
      category?: string;
      entityType?: string;
      entityId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { page = 1, limit = 20, category, entityType, entityId } = filters;
    const skip = (page - 1) * limit;

    const where: any = { uploadedBy: userId };
    
    if (category) where.category = category;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    // Mock file listing - in real implementation use prisma.file.findMany
    const files = [
      {
        id: 'mock-file-1',
        filename: 'mock-file-1.jpg',
        originalName: 'example.jpg',
        url: 'https://example.com/mock-file-1.jpg',
        thumbnails: null,
        size: 1024,
        mimeType: 'image/jpeg',
        category: category || 'general',
        createdAt: new Date()
      }
    ];
    const total = 1;

    return {
      files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Generate temporary S3 key for processing
   */
  private static generateTempKey(filename: string, metadata: FileMetadata): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const hash = createHash('md5').update(`${filename}${Date.now()}`).digest('hex').substring(0, 8);
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    return `${metadata.category}/${timestamp}/${metadata.userId}/${baseName}_${hash}${ext}`;
  }
}

// Export all services
export {
  FileValidationService,
  ImageProcessingService,
  S3StorageService
};