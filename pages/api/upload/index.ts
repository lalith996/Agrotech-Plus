import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { StorageService, VirusScanService, FileMetadataService, DEFAULT_UPLOAD_CONFIGS } from '@/lib/storage'
import { prisma } from '@/lib/db-optimization'
import multer from 'multer'
import { z } from 'zod'

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
    files: 10 // Max 10 files per request
  }
})

const uploadSchema = z.object({
  type: z.enum(['profileImages', 'productImages', 'documents', 'qcPhotos']),
  entityId: z.string().optional(),
  entityType: z.string().optional()
})

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

// Promisify multer
const multerMiddleware = (req: any, res: any) => {
  return new Promise((resolve, reject) => {
    upload.array('files')(req, res, (err) => {
      if (err) reject(err)
      else resolve(req.files)
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Parse multipart form data
    await multerMiddleware(req, res)
    const files = (req as any).files as Express.Multer.File[]
    const body = (req as any).body

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' })
    }

    // Validate request body
    const validationResult = uploadSchema.safeParse(body)
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid request parameters',
        errors: validationResult.error.errors
      })
    }

    const { type, entityId, entityType } = validationResult.data
    const config = DEFAULT_UPLOAD_CONFIGS[type]

    if (!config) {
      return res.status(400).json({ message: 'Invalid upload type' })
    }

    // Validate each file
    const validationErrors: string[] = []
    for (const file of files) {
      // Check file size
      if (file.size > config.maxFileSize) {
        validationErrors.push(`File ${file.originalname} exceeds maximum size of ${StorageService.formatFileSize(config.maxFileSize)}`)
      }

      // Check file type
      if (!config.allowedTypes.includes(file.mimetype)) {
        validationErrors.push(`File ${file.originalname} has unsupported type ${file.mimetype}`)
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'File validation failed',
        errors: validationErrors
      })
    }

    // Virus scan if required
    if (config.requireVirusScan) {
      const scanResults = await VirusScanService.scanMultipleFiles(files)

      const threats = scanResults.filter(result => !result.clean)
      if (threats.length > 0) {
        return res.status(400).json({
          message: 'Virus scan failed',
          threats: threats.map(t => ({ fileName: t.fileName, threat: t.threat }))
        })
      }
    }

    // Upload files
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        try {
          const uploadResult = await StorageService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            {
              folder: config.folder,
              maxSize: config.maxFileSize,
              allowedTypes: config.allowedTypes,
              compress: config.compressImages,
              generateThumbnails: config.generateThumbnails
            }
          )

          // Extract metadata
          const metadata = await FileMetadataService.extractMetadata(file.buffer, file.mimetype)

          // Save file record to database
          const fileRecord = await prisma.file.create({
            data: {
              filename: uploadResult.key || file.originalname,
              originalName: uploadResult.originalName || file.originalname,
              mimeType: uploadResult.type || file.mimetype,
              size: uploadResult.size || file.size,
              url: uploadResult.url || '',
              thumbnails: uploadResult.thumbnails ? uploadResult.thumbnails.map(url => ({ url, name: 'thumbnail' })) : undefined,
              metadata: metadata,
              encrypted: true,
              virusScanned: config.requireVirusScan,
              category: config.folder,
              entityType: entityType,
              entityId: entityId,
              uploadedBy: session.user.id
            }
          })

          return {
            id: fileRecord.id,
            key: uploadResult.key,
            url: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnails?.[0],
            originalName: uploadResult.originalName || file.originalname,
            size: uploadResult.size || file.size,
            type: uploadResult.type || file.mimetype,
            metadata
          }
        } catch (error) {
          // console.error(`Failed to upload file ${file.originalname}:`, error)
          throw new Error(`Failed to upload ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s)`,
      files: uploadResults
    })

  } catch (error) {
    // console.error('Upload error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}