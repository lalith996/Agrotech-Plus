import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileUpload, UploadedFile } from "@/components/ui/file-upload"
import { 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  Upload,
  Calendar,
  User,
  HardDrive
} from "lucide-react"
import { UserRole } from "@prisma/client"
import { toast } from "sonner"

interface FileRecord extends UploadedFile {
  uploadedAt: string
  uploadedBy: {
    name: string
    email: string
  } | null
  entityId?: string
  entityType?: string
  folder: string
}

export default function FileManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [folderFilter, setFolderFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedUploadType, setSelectedUploadType] = useState<'profileImages' | 'productImages' | 'documents' | 'qcPhotos'>('documents')

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      if (session.user.role !== UserRole.ADMIN) {
        router.push("/")
        return
      }
      fetchFiles()
    }
  }, [status, session, router])

  useEffect(() => {
    filterFiles()
  }, [files, searchTerm, folderFilter, typeFilter])

  const fetchFiles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/files")
      if (!response.ok) throw new Error("Failed to fetch files")
      
      const data = await response.json()
      setFiles(data.files)
    } catch (error) {
      // console.error("Error fetching files:", error)
      toast.error("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }

  const filterFiles = () => {
    let filtered = files

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.uploadedBy?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.uploadedBy?.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Folder filter
    if (folderFilter !== "all") {
      filtered = filtered.filter(file => file.folder === folderFilter)
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(file => {
        if (typeFilter === "images") return file.type.startsWith("image/")
        if (typeFilter === "documents") return file.type === "application/pdf" || file.type.includes("document")
        return true
      })
    }

    setFilteredFiles(filtered)
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Failed to delete file")
      
      setFiles(files.filter(file => file.id !== fileId))
      toast.success("File deleted successfully")
    } catch (error) {
      // console.error("Error deleting file:", error)
      toast.error("Failed to delete file")
    }
  }

  const downloadFile = (file: FileRecord) => {
    window.open(file.url, '_blank')
  }

  const previewFile = (file: FileRecord) => {
    if (file.type.startsWith('image/')) {
      window.open(file.url, '_blank')
    } else {
      downloadFile(file)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-600" />
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-600" />
    return <File className="w-5 h-5 text-gray-600" />
  }

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'bg-blue-100 text-blue-800'
    if (mimeType === 'application/pdf') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const folders = Array.from(new Set(files.map(file => file.folder)))
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">File Management</h1>
              <p className="text-gray-600">Manage uploaded files and storage</p>
            </div>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Files</DialogTitle>
                  <DialogDescription>
                    Upload new files to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Upload Type</Label>
                    <Select value={selectedUploadType} onValueChange={(value: any) => setSelectedUploadType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="productImages">Product Images</SelectItem>
                        <SelectItem value="profileImages">Profile Images</SelectItem>
                        <SelectItem value="qcPhotos">QC Photos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FileUpload
                    uploadType={selectedUploadType}
                    onUploadComplete={(uploadedFiles) => {
                      fetchFiles()
                      setUploadDialogOpen(false)
                      toast.success(`Uploaded ${uploadedFiles.length} file(s)`)
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <File className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Files</p>
                  <p className="text-2xl font-bold text-gray-900">{files.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <HardDrive className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Image className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Images</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {files.filter(f => f.type.startsWith('image/')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Documents</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {files.filter(f => !f.type.startsWith('image/')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search Files</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or uploader..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Folder</Label>
                <Select value={folderFilter} onValueChange={setFolderFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Folders</SelectItem>
                    {folders.map(folder => (
                      <SelectItem key={folder} value={folder}>
                        {folder.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="images">Images</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setFolderFilter("all")
                    setTypeFilter("all")
                  }}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle>Files ({filteredFiles.length})</CardTitle>
            <CardDescription>
              Manage all uploaded files in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-600">
                  {files.length === 0 ? "No files have been uploaded yet" : "No files match your current filters"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4 flex-1">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.originalName}
                          </p>
                          <Badge className={getFileTypeColor(file.type)}>
                            {file.type.split('/')[1]}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center">
                            <HardDrive className="w-3 h-3 mr-1" />
                            {formatFileSize(file.size)}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                          {file.uploadedBy && (
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {file.uploadedBy.name}
                            </span>
                          )}
                          <span className="capitalize">
                            {file.folder.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewFile(file)}
                        title="Preview/View"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(file)}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}