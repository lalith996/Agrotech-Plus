import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Eye,
  Download,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface UploadedFile {
  id: string
  key: string
  url: string
  thumbnailUrl?: string
  originalName: string
  size: number
  type: string
  metadata?: Record<string, any>
}

interface FileUploadProps {
  uploadType: 'profileImages' | 'productImages' | 'documents' | 'qcPhotos'
  maxFiles?: number
  maxFileSize?: number
  allowedTypes?: string[]
  onUploadComplete?: (files: UploadedFile[]) => void
  onFileRemove?: (fileId: string) => void
  existingFiles?: UploadedFile[]
  entityId?: string
  entityType?: string
  className?: string
  disabled?: boolean
}

interface FileWithProgress extends File {
  id: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  uploadedFile?: UploadedFile
}

export function FileUpload({
  uploadType,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  onUploadComplete,
  onFileRemove,
  existingFiles = [],
  entityId,
  entityType,
  className,
  disabled = false
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />
    if (mimeType === 'application/pdf') return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)}`
    }
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} not allowed`
    }
    return null
  }

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return

    const newFiles: FileWithProgress[] = []
    const errors: string[] = []

    Array.from(selectedFiles).forEach((file) => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
        return
      }

      if (files.length + newFiles.length + existingFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`)
        return
      }

      const fileWithProgress: FileWithProgress = Object.assign(file, {
        id: `${Date.now()}-${Math.random()}`,
        progress: 0,
        status: 'uploading' as const
      })

      newFiles.push(fileWithProgress)
    })

    if (errors.length > 0) {
      toast.error(`Upload errors: ${errors.join(', ')}`)
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
      uploadFiles(newFiles)
    }
  }, [files, existingFiles, maxFiles, maxFileSize, allowedTypes, disabled])

  const uploadFiles = async (filesToUpload: FileWithProgress[]) => {
    setIsUploading(true)

    try {
      const formData = new FormData()
      filesToUpload.forEach(file => {
        formData.append('files', file)
      })
      formData.append('type', uploadType)
      if (entityId) formData.append('entityId', entityId)
      if (entityType) formData.append('entityType', entityType)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(file => {
          if (filesToUpload.some(f => f.id === file.id) && file.progress < 90) {
            return { ...file, progress: Math.min(file.progress + 10, 90) }
          }
          return file
        }))
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const data = await response.json()
      const uploadedFiles: UploadedFile[] = data.files

      // Update file status
      setFiles(prev => prev.map(file => {
        const uploadedFile = uploadedFiles.find((_, index) => 
          filesToUpload[index]?.id === file.id
        )
        
        if (uploadedFile) {
          return {
            ...file,
            progress: 100,
            status: 'completed' as const,
            uploadedFile
          }
        }
        return file
      }))

      toast.success(`Successfully uploaded ${uploadedFiles.length} file(s)`)
      onUploadComplete?.(uploadedFiles)

    } catch (error) {
      // console.error('Upload error:', error)
      
      // Mark files as error
      setFiles(prev => prev.map(file => {
        if (filesToUpload.some(f => f.id === file.id)) {
          return {
            ...file,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        }
        return file
      }))

      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const removeExistingFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      onFileRemove?.(fileId)
      toast.success('File deleted successfully')
    } catch (error) {
      // console.error('Delete error:', error)
      toast.error('Failed to delete file')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const totalFiles = files.length + existingFiles.length
  const canAddMore = totalFiles < maxFiles && !disabled

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {canAddMore && (
        <Card
          className={cn(
            'border-2 border-dashed transition-colors cursor-pointer',
            isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Upload className="w-8 h-8 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 text-center mb-2">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-gray-500 text-center">
              Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">
              Supported: {allowedTypes.map(type => type.split('/')[1]).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* File List */}
      {(files.length > 0 || existingFiles.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Files ({totalFiles}/{maxFiles})
          </h4>
          
          {/* Existing Files */}
          {existingFiles.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Uploaded
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {file.thumbnailUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.thumbnailUrl, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExistingFile(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Uploading Files */}
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="w-full mt-2" />
                    )}
                    {file.status === 'error' && file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'uploading' && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Uploading...
                      </Badge>
                    )}
                    {file.status === 'completed' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {file.status === 'error' && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Status */}
      {isUploading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Uploading files...</p>
        </div>
      )}
    </div>
  )
}