// Mock AWS SDK imports for now - install @aws-sdk/client-s3 for production
// import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import sharp from 'sharp'
// Mock UUID for development - install @types/uuid for production
// import { v4 as uuidv4 } from 'uuid'
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Mock S3 client for development
const mockS3Client = {
  send: async (command: any) => {
    // console.log('Mock S3 operation:', command.constructor.name);
    return { 
      Location: `https://mock-bucket.s3.amazonaws.com/${Date.now()}-mock-file`,
      Key: `mock-${Date.now()}`,
      ETag: '"mock-etag"'
    };
  }
};

const mockGetSignedUrl = async (client: any, command: any, options?: any) => {
  return `https://mock-bucket.s3.amazonaws.com/signed-url-${Date.now()}`;
};

// Use mock S3 client for development
const s3Client = mockS3Client;

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'agrotrack-files'

export interface UploadOptions {
  folder?: string
  maxSize?: number
  allowedTypes?: string[]
  generateThumbnails?: boolean
  watermark?: boolean
  compress?: boolean
}

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  thumbnails?: string[]
  originalName?: string
  type?: string
  size?: number
  error?: string
}

export interface FileInfo {
  key: string
  url: string
  size: number
  contentType: string
  lastModified: Date
}

export class StorageService {
  /**
   * Upload file to S3 with optional image processing
   */
  static async uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const {
        folder = 'uploads',
        maxSize = 10 * 1024 * 1024, // 10MB
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        generateThumbnails = false,
        watermark = false
      } = options

      // Validate file size
      if (file.length > maxSize) {
        return {
          success: false,
          error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
        }
      }

      // Validate content type
      if (!allowedTypes.includes(contentType)) {
        return {
          success: false,
          error: `File type ${contentType} is not allowed`
        }
      }

      let processedFile = file
      const thumbnails: string[] = []

      // Process image if needed
      if (contentType.startsWith('image/') && (generateThumbnails || watermark)) {
        try {
          let image = sharp(file)

          // Add watermark if requested
          if (watermark) {
            const watermarkSvg = `
              <svg width="200" height="50">
                <text x="10" y="30" font-family="Arial" font-size="16" fill="rgba(255,255,255,0.7)">
                  AgroTrack+
                </text>
              </svg>
            `
            const watermarkBuffer = Buffer.from(watermarkSvg)
            image = image.composite([{ input: watermarkBuffer, gravity: 'southeast' }])
          }

          // Generate main processed image
          processedFile = await image
            .jpeg({ quality: 85, progressive: true })
            .toBuffer()

          // Generate thumbnails if requested
          if (generateThumbnails) {
            const thumbnailSizes = [
              { name: 'thumb', width: 150, height: 150 },
              { name: 'small', width: 300, height: 300 },
              { name: 'medium', width: 600, height: 600 }
            ]

            for (const size of thumbnailSizes) {
              const thumbnailBuffer = await sharp(file)
                .resize(size.width, size.height, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer()

              const thumbnailKey = `${folder}/thumbnails/${uuidv4()}_${size.name}.jpg`
              
              // Mock thumbnail upload
              const thumbnailUrl = `https://mock-bucket.s3.amazonaws.com/${thumbnailKey}`
              thumbnails.push(thumbnailUrl)
            }
          }
        } catch (imageError) {
          // console.warn('Image processing failed, uploading original:', imageError)
        }
      }

      // Generate unique key
      const key = `${folder}/${uuidv4()}_${filename}`

      // Mock upload to S3
      const result = await s3Client.send({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: processedFile,
        ContentType: contentType
      })

      const url = `https://mock-bucket.s3.amazonaws.com/${key}`

      return {
        success: true,
        url,
        key,
        originalName: filename,
        type: contentType,
        size: file.length,
        thumbnails: thumbnails.length > 0 ? thumbnails : undefined
      }
    } catch (error) {
      // console.error('Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      await s3Client.send({
        Bucket: BUCKET_NAME,
        Key: key
      })

      return { success: true }
    } catch (error) {
      // console.error('Delete error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      }
    }
  }

  /**
   * Get signed URL for private file access
   */
  static async getSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = {
        Bucket: BUCKET_NAME,
        Key: key
      }

      return await mockGetSignedUrl(s3Client, command, { expiresIn })
    } catch (error) {
      // console.error('Get signed URL error:', error)
      throw error
    }
  }

  /**
   * Get file info
   */
  static async getFileInfo(key: string): Promise<FileInfo | null> {
    try {
      // Mock file info
      return {
        key,
        url: `https://mock-bucket.s3.amazonaws.com/${key}`,
        size: 1024,
        contentType: 'application/octet-stream',
        lastModified: new Date()
      }
    } catch (error) {
      // console.error('Get file info error:', error)
      return null
    }
  }

  /**
   * List files in folder
   */
  static async listFiles(
    folder: string = '',
    maxKeys: number = 100
  ): Promise<FileInfo[]> {
    try {
      // Mock file listing
      return [
        {
          key: `${folder}/mock-file-1.jpg`,
          url: `https://mock-bucket.s3.amazonaws.com/${folder}/mock-file-1.jpg`,
          size: 2048,
          contentType: 'image/jpeg',
          lastModified: new Date()
        }
      ]
    } catch (error) {
      // console.error('List files error:', error)
      return []
    }
  }

  /**
   * Copy file within S3
   */
  static async copyFile(
    sourceKey: string,
    destinationKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock copy operation
      // console.log(`Mock copy from ${sourceKey} to ${destinationKey}`)
      
      return { success: true }
    } catch (error) {
      // console.error('Copy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Copy failed'
      }
    }
  }

  /**
   * Generate upload presigned URL for direct client uploads
   */
  static async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<{ uploadUrl: string; fields: Record<string, string> }> {
    try {
      // Mock presigned upload URL
      return {
        uploadUrl: `https://mock-bucket.s3.amazonaws.com/${key}`,
        fields: {
          'Content-Type': contentType,
          'x-amz-meta-uploaded-by': 'agrotrack'
        }
      }
    } catch (error) {
      // console.error('Get upload URL error:', error)
      throw error
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Generate secure filename
   */
  static generateSecureFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    return `${timestamp}-${random}.${extension}`
  }

  /**
   * Get signed upload URL
   */
  static async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      // Mock signed upload URL
      return `https://mock-bucket.s3.amazonaws.com/${key}?expires=${expiresIn}`
    } catch (error) {
      // console.error('Get signed upload URL error:', error)
      throw error
    }
  }
}

export default StorageService

// Export missing constants and services for compatibility
export const DEFAULT_UPLOAD_CONFIGS = {
  images: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    generateThumbnails: true,
    compressImages: true,
    watermark: false,
    folder: 'images',
    requireVirusScan: true
  },
  documents: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword'],
    generateThumbnails: false,
    compressImages: false,
    watermark: false,
    folder: 'documents',
    requireVirusScan: true
  },
  profileImages: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    generateThumbnails: true,
    compressImages: true,
    watermark: false,
    folder: 'profiles',
    requireVirusScan: true
  },
  productImages: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    generateThumbnails: true,
    compressImages: true,
    watermark: false,
    folder: 'products',
    requireVirusScan: true
  },
  qcPhotos: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    generateThumbnails: true,
    compressImages: true,
    watermark: false,
    folder: 'qc',
    requireVirusScan: true
  }
};

export class VirusScanService {
  static async scanFile(buffer: Buffer): Promise<{ isClean: boolean; threat?: string }> {
    // Mock virus scan - always return clean for development
    return { isClean: true };
  }

  static async scanMultipleFiles(files: Express.Multer.File[]): Promise<Array<{ fileName: string; clean: boolean; threat?: string }>> {
    // Mock virus scan for multiple files - always return clean for development
    return files.map(file => ({
      fileName: file.originalname,
      clean: true
    }));
  }
}

export class FileMetadataService {
  static async extractMetadata(buffer: Buffer, contentType: string): Promise<Record<string, any>> {
    // Mock metadata extraction
    return {
      size: buffer.length,
      contentType,
      extractedAt: new Date().toISOString()
    };
  }
}