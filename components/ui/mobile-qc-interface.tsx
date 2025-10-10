import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ResponsiveContainer, ResponsiveGrid, TouchFriendly, useResponsive } from '@/components/ui/responsive-layout'
import { 
  Camera, 
  Check, 
  X, 
  AlertTriangle, 
  Upload,
  Minus,
  Plus,
  Save,
  RotateCcw,
  Wifi,
  WifiOff,
  Clock,
  MapPin,
  Mic,
  MicOff,
  PenTool
} from 'lucide-react'
import { toast } from 'sonner'

interface QCInspectionItem {
  id: string
  farmerDeliveryId: string
  productId: string
  productName: string
  farmerName: string
  farmName: string
  expectedQuantity: number
  unit: string
  deliveryDate: string
  status: 'pending' | 'inspecting' | 'completed'
}

interface QCResult {
  actualQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  rejectionReasons: string[]
  qualityScore: number
  notes: string
  photos: File[]
  audioNotes: File[]
  geolocation?: {
    latitude: number
    longitude: number
    timestamp: number
  }
  signature?: string
  timestamp: number
}

interface MobileQCInterfaceProps {
  inspections: QCInspectionItem[]
  onSubmitInspection: (inspectionId: string, result: QCResult) => Promise<void>
  offlineMode?: boolean
  onOfflineSubmit?: (inspectionId: string, result: QCResult) => void
}

const REJECTION_REASONS = [
  { value: 'size_inconsistency', label: 'Size Inconsistency' },
  { value: 'quality_degradation', label: 'Quality Degradation' },
  { value: 'pest_damage', label: 'Pest Damage' },
  { value: 'overripe', label: 'Overripe' },
  { value: 'underripe', label: 'Underripe' },
  { value: 'packaging_issues', label: 'Packaging Issues' },
  { value: 'contamination', label: 'Contamination' },
  { value: 'other', label: 'Other' }
]

export function MobileQCInterface({ 
  inspections, 
  onSubmitInspection, 
  offlineMode = false,
  onOfflineSubmit 
}: MobileQCInterfaceProps) {
  const [currentInspection, setCurrentInspection] = useState<QCInspectionItem | null>(null)
  const [qcResult, setQcResult] = useState<QCResult>({
    actualQuantity: 0,
    acceptedQuantity: 0,
    rejectedQuantity: 0,
    rejectionReasons: [],
    qualityScore: 10,
    notes: '',
    photos: [],
    audioNotes: [],
    timestamp: Date.now()
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [queuedSubmissions, setQueuedSubmissions] = useState<Array<{id: string, result: QCResult}>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isMobile, isTablet } = useResponsive()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Get geolocation when starting inspection
  useEffect(() => {
    if (currentInspection && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setQcResult(prev => ({
            ...prev,
            geolocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now()
            }
          }))
        },
        (error) => {
          // console.warn('Geolocation error:', error)
        }
      )
    }
  }, [currentInspection])

  // Load queued submissions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('qc-queued-submissions')
    if (stored) {
      try {
        setQueuedSubmissions(JSON.parse(stored))
      } catch (error) {
        // console.error('Error loading queued submissions:', error)
      }
    }
  }, [])

  // Save queued submissions to localStorage
  useEffect(() => {
    localStorage.setItem('qc-queued-submissions', JSON.stringify(queuedSubmissions))
  }, [queuedSubmissions])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queuedSubmissions.length > 0) {
      syncQueuedSubmissions()
    }
  }, [isOnline])

  const syncQueuedSubmissions = async () => {
    for (const submission of queuedSubmissions) {
      try {
        await onSubmitInspection(submission.id, submission.result)
        setQueuedSubmissions(prev => prev.filter(s => s.id !== submission.id))
        toast.success(`Synced inspection for ${submission.id}`)
      } catch (error) {
        // console.error('Sync error:', error)
        break // Stop syncing on first error
      }
    }
  }

  const startInspection = (inspection: QCInspectionItem) => {
    setCurrentInspection(inspection)
    setQcResult({
      actualQuantity: inspection.expectedQuantity,
      acceptedQuantity: inspection.expectedQuantity,
      rejectedQuantity: 0,
      rejectionReasons: [],
      qualityScore: 10,
      notes: '',
      photos: [],
      audioNotes: [],
      timestamp: Date.now()
    })
  }

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], `audio-note-${Date.now()}.webm`, { type: 'audio/webm' })
        setQcResult(prev => ({
          ...prev,
          audioNotes: [...prev.audioNotes, file]
        }))
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      toast.error('Could not access microphone')
      // console.error('Audio recording error:', error)
    }
  }

  const stopAudioRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setMediaRecorder(null)
      setIsRecording(false)
    }
  }

  const removeAudioNote = (index: number) => {
    setQcResult(prev => ({
      ...prev,
      audioNotes: prev.audioNotes.filter((_, i) => i !== index)
    }))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setQcResult(prev => ({ ...prev, signature: undefined }))
      }
    }
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const dataURL = canvas.toDataURL()
      setQcResult(prev => ({ ...prev, signature: dataURL }))
      toast.success('Signature saved')
    }
  }

  const updateQuantity = (field: 'actualQuantity' | 'acceptedQuantity' | 'rejectedQuantity', value: number) => {
    const newResult = { ...qcResult, [field]: Math.max(0, value) }
    
    // Auto-calculate rejected quantity when actual or accepted changes
    if (field === 'actualQuantity' || field === 'acceptedQuantity') {
      if (field === 'actualQuantity') {
        newResult.acceptedQuantity = Math.min(newResult.acceptedQuantity, value)
      }
      newResult.rejectedQuantity = newResult.actualQuantity - newResult.acceptedQuantity
    }
    
    // Auto-calculate accepted quantity when rejected changes
    if (field === 'rejectedQuantity') {
      newResult.acceptedQuantity = Math.max(0, newResult.actualQuantity - value)
    }
    
    setQcResult(newResult)
  }

  const toggleRejectionReason = (reason: string) => {
    const reasons = qcResult.rejectionReasons.includes(reason)
      ? qcResult.rejectionReasons.filter(r => r !== reason)
      : [...qcResult.rejectionReasons, reason]
    
    setQcResult({ ...qcResult, rejectionReasons: reasons })
  }

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      
      if (!isValidType) {
        toast.error('Please select only image files')
        return false
      }
      
      if (!isValidSize) {
        toast.error('Image size must be less than 10MB')
        return false
      }
      
      return true
    })
    
    setQcResult({
      ...qcResult,
      photos: [...qcResult.photos, ...validFiles].slice(0, 5) // Max 5 photos
    })
  }

  const removePhoto = (index: number) => {
    setQcResult({
      ...qcResult,
      photos: qcResult.photos.filter((_, i) => i !== index)
    })
  }

  const submitInspection = async () => {
    if (!currentInspection) return
    
    // Validation
    if (qcResult.actualQuantity <= 0) {
      toast.error('Please enter the actual quantity received')
      return
    }
    
    if (qcResult.rejectedQuantity > 0 && qcResult.rejectionReasons.length === 0) {
      toast.error('Please select rejection reasons for rejected items')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      if (isOnline) {
        await onSubmitInspection(currentInspection.id, qcResult)
        toast.success('Inspection completed successfully')
      } else {
        // Queue for offline submission
        const newSubmission = { id: currentInspection.id, result: qcResult }
        setQueuedSubmissions(prev => [...prev, newSubmission])
        
        if (onOfflineSubmit) {
          onOfflineSubmit(currentInspection.id, qcResult)
        }
        
        toast.success('Inspection saved offline - will sync when online')
      }
      
      setCurrentInspection(null)
      setQcResult({
        actualQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        rejectionReasons: [],
        qualityScore: 10,
        notes: '',
        photos: [],
        audioNotes: [],
        timestamp: Date.now()
      })
    } catch (error) {
      toast.error('Failed to submit inspection')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetInspection = () => {
    if (currentInspection) {
      setQcResult({
        actualQuantity: currentInspection.expectedQuantity,
        acceptedQuantity: currentInspection.expectedQuantity,
        rejectedQuantity: 0,
        rejectionReasons: [],
        qualityScore: 10,
        notes: '',
        photos: [],
        audioNotes: [],
        timestamp: Date.now()
      })
      clearSignature()
    }
  }

  if (!currentInspection) {
    return (
      <ResponsiveContainer className="py-4">
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline Mode'}
              </span>
            </div>
            
            {queuedSubmissions.length > 0 && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{queuedSubmissions.length} queued</span>
              </Badge>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Quality Control Inspections
            </h2>
            <p className="text-gray-600">
              Select a delivery to start inspection
            </p>
          </div>
          
          <ResponsiveGrid cols={{ default: 1, sm: 1, md: 2 }} gap="md">
            {inspections.map((inspection) => (
              <Card key={inspection.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{inspection.productName}</CardTitle>
                    <Badge variant={inspection.status === 'pending' ? 'secondary' : 'default'}>
                      {inspection.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {inspection.farmerName} • {inspection.farmName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expected:</span>
                      <span className="font-medium">
                        {inspection.expectedQuantity} {inspection.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Date:</span>
                      <span className="font-medium">
                        {new Date(inspection.deliveryDate).toLocaleDateString()}
                      </span>
                    </div>
                    <TouchFriendly>
                      <Button 
                        onClick={() => startInspection(inspection)}
                        className="w-full"
                        disabled={inspection.status === 'completed'}
                      >
                        {inspection.status === 'completed' ? 'Completed' : 'Start Inspection'}
                      </Button>
                    </TouchFriendly>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </div>
      </ResponsiveContainer>
    )
  }

  const acceptanceRate = qcResult.actualQuantity > 0 
    ? Math.round((qcResult.acceptedQuantity / qcResult.actualQuantity) * 100) 
    : 0

  return (
    <ResponsiveContainer className="py-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Inspecting: {currentInspection.productName}
            </h2>
            <p className="text-gray-600">
              {currentInspection.farmerName} • Expected: {currentInspection.expectedQuantity} {currentInspection.unit}
            </p>
          </div>
          <TouchFriendly>
            <Button
              variant="outline"
              onClick={() => setCurrentInspection(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </TouchFriendly>
        </div>

        {/* Quantity Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quantity Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Actual Quantity */}
            <div className="space-y-2">
              <Label>Actual Quantity Received</Label>
              <div className="flex items-center space-x-2">
                <TouchFriendly>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity('actualQuantity', qcResult.actualQuantity - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </TouchFriendly>
                <Input
                  type="number"
                  value={qcResult.actualQuantity}
                  onChange={(e) => updateQuantity('actualQuantity', Number(e.target.value))}
                  className="text-center text-lg font-medium"
                />
                <TouchFriendly>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity('actualQuantity', qcResult.actualQuantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TouchFriendly>
                <span className="text-gray-600 min-w-0">{currentInspection.unit}</span>
              </div>
            </div>

            {/* Accepted/Rejected Split */}
            <ResponsiveGrid cols={{ default: 1, sm: 2 }} gap="md">
              <div className="space-y-2">
                <Label className="text-green-700">Accepted Quantity</Label>
                <div className="flex items-center space-x-2">
                  <TouchFriendly>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity('acceptedQuantity', qcResult.acceptedQuantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </TouchFriendly>
                  <Input
                    type="number"
                    value={qcResult.acceptedQuantity}
                    onChange={(e) => updateQuantity('acceptedQuantity', Number(e.target.value))}
                    className="text-center font-medium text-green-700"
                  />
                  <TouchFriendly>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity('acceptedQuantity', qcResult.acceptedQuantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TouchFriendly>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-red-700">Rejected Quantity</Label>
                <div className="flex items-center space-x-2">
                  <TouchFriendly>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity('rejectedQuantity', qcResult.rejectedQuantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </TouchFriendly>
                  <Input
                    type="number"
                    value={qcResult.rejectedQuantity}
                    onChange={(e) => updateQuantity('rejectedQuantity', Number(e.target.value))}
                    className="text-center font-medium text-red-700"
                  />
                  <TouchFriendly>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity('rejectedQuantity', qcResult.rejectedQuantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TouchFriendly>
                </div>
              </div>
            </ResponsiveGrid>

            {/* Acceptance Rate */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Acceptance Rate</span>
                <span className={`text-lg font-bold ${
                  acceptanceRate >= 90 ? 'text-green-600' : 
                  acceptanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {acceptanceRate}%
                </span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    acceptanceRate >= 90 ? 'bg-green-500' : 
                    acceptanceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${acceptanceRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejection Reasons */}
        {qcResult.rejectedQuantity > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                Rejection Reasons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveGrid cols={{ default: 1, sm: 2 }} gap="sm">
                {REJECTION_REASONS.map((reason) => (
                  <TouchFriendly key={reason.value}>
                    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={reason.value}
                        checked={qcResult.rejectionReasons.includes(reason.value)}
                        onCheckedChange={() => toggleRejectionReason(reason.value)}
                      />
                      <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                        {reason.label}
                      </Label>
                    </div>
                  </TouchFriendly>
                ))}
              </ResponsiveGrid>
            </CardContent>
          </Card>
        )}

        {/* Quality Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Score (1-10)</span>
                <span className="text-2xl font-bold text-blue-600">{qcResult.qualityScore}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.1"
                value={qcResult.qualityScore}
                onChange={(e) => setQcResult({ ...qcResult, qualityScore: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Poor (1)</span>
                <span>Average (5)</span>
                <span>Excellent (10)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Photos</CardTitle>
            <CardDescription>
              Take photos of the delivery for quality documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TouchFriendly>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo ({qcResult.photos.length}/5)
                </Button>
              </TouchFriendly>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
              />
              
              {qcResult.photos.length > 0 && (
                <ResponsiveGrid cols={{ default: 2, sm: 3 }} gap="sm">
                  {qcResult.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`QC Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <TouchFriendly>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </TouchFriendly>
                    </div>
                  ))}
                </ResponsiveGrid>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audio Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audio Notes</CardTitle>
            <CardDescription>
              Record voice observations for detailed documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <TouchFriendly>
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopAudioRecording : startAudioRecording}
                    className="flex-1"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>
                </TouchFriendly>
              </div>
              
              {qcResult.audioNotes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Recorded Notes ({qcResult.audioNotes.length})</Label>
                  {qcResult.audioNotes.map((audio, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Audio Note {index + 1}</span>
                        <span className="text-xs text-gray-500">
                          {(audio.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <TouchFriendly>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAudioNote(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TouchFriendly>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Digital Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inspector Signature</CardTitle>
            <CardDescription>
              Sign to confirm the inspection results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={150}
                  className="w-full h-32 border border-gray-200 rounded cursor-crosshair"
                  onMouseDown={(e) => {
                    const canvas = canvasRef.current
                    if (canvas) {
                      const rect = canvas.getBoundingClientRect()
                      const ctx = canvas.getContext('2d')
                      if (ctx) {
                        ctx.beginPath()
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
                        
                        const draw = (e: MouseEvent) => {
                          ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
                          ctx.stroke()
                        }
                        
                        const stopDrawing = () => {
                          canvas.removeEventListener('mousemove', draw)
                          canvas.removeEventListener('mouseup', stopDrawing)
                        }
                        
                        canvas.addEventListener('mousemove', draw)
                        canvas.addEventListener('mouseup', stopDrawing)
                      }
                    }
                  }}
                />
              </div>
              
              <div className="flex space-x-2">
                <TouchFriendly className="flex-1">
                  <Button
                    variant="outline"
                    onClick={clearSignature}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </TouchFriendly>
                
                <TouchFriendly className="flex-1">
                  <Button
                    onClick={saveSignature}
                    className="w-full"
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Save Signature
                  </Button>
                </TouchFriendly>
              </div>
              
              {qcResult.signature && (
                <div className="text-center">
                  <Badge variant="secondary">Signature Captured</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Info */}
        {qcResult.geolocation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Location Verified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>Lat: {qcResult.geolocation.latitude.toFixed(6)}</p>
                <p>Lng: {qcResult.geolocation.longitude.toFixed(6)}</p>
                <p>Captured: {new Date(qcResult.geolocation.timestamp).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any additional observations or comments..."
              value={qcResult.notes}
              onChange={(e) => setQcResult({ ...qcResult, notes: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <TouchFriendly className="flex-1">
            <Button
              variant="outline"
              onClick={resetInspection}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </TouchFriendly>
          
          <TouchFriendly className="flex-1">
            <Button
              onClick={submitInspection}
              disabled={isSubmitting}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Complete Inspection'}
            </Button>
          </TouchFriendly>
        </div>
      </div>
    </ResponsiveContainer>
  )
}