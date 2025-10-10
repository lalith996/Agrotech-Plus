import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Camera, CheckCircle, XCircle, AlertTriangle, Package, User, Calendar, Save, ArrowLeft } from "lucide-react"
import { UserRole } from "@prisma/client"
import { toast } from "sonner"

interface QCInspection {
  id: string
  farmerDeliveryId: string
  productId: string
  productName: string
  farmerName: string
  farmName: string
  expectedQuantity: number
  unit: string
  deliveryDate: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface QCResult {
  productId: string
  acceptedQuantity: number
  rejectedQuantity: number
  rejectionReasons: string[]
  photos: string[]
  notes: string
}

const REJECTION_REASONS = [
  'Size inconsistency',
  'Quality degradation',
  'Pest damage',
  'Overripe',
  'Underripe',
  'Physical damage',
  'Packaging issues',
  'Contamination',
  'Wrong variety',
  'Other'
]

export default function QualityControlInterface() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [inspections, setInspections] = useState<QCInspection[]>([])
  const [currentInspection, setCurrentInspection] = useState<QCInspection | null>(null)
  const [qcResult, setQCResult] = useState<QCResult>({
    productId: '',
    acceptedQuantity: 0,
    rejectedQuantity: 0,
    rejectionReasons: [],
    photos: [],
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
        router.push("/")
        return
      }
      fetchInspections()
    }
  }, [status, session, router])

  const fetchInspections = async () => {
    try {
      const response = await fetch("/api/admin/qc/inspections")
      if (!response.ok) throw new Error("Failed to fetch inspections")
      const data = await response.json()
      setInspections(data.inspections)
    } catch (error) {
      // console.error("Error fetching inspections:", error)
      toast.error("Failed to load inspections")
    } finally {
      setIsLoading(false)
    }
  }

  const startInspection = (inspection: QCInspection) => {
    setCurrentInspection(inspection)
    setQCResult({
      productId: inspection.productId,
      acceptedQuantity: inspection.expectedQuantity,
      rejectedQuantity: 0,
      rejectionReasons: [],
      photos: [],
      notes: ''
    })
  }

  const updateQuantity = (field: 'acceptedQuantity' | 'rejectedQuantity', value: number) => {
    const newResult = { ...qcResult, [field]: value }
    
    // Auto-adjust the other quantity
    if (currentInspection) {
      const total = currentInspection.expectedQuantity
      if (field === 'acceptedQuantity') {
        newResult.rejectedQuantity = Math.max(0, total - value)
      } else {
        newResult.acceptedQuantity = Math.max(0, total - value)
      }
    }
    
    setQCResult(newResult)
  }

  const toggleRejectionReason = (reason: string) => {
    const reasons = qcResult.rejectionReasons.includes(reason)
      ? qcResult.rejectionReasons.filter(r => r !== reason)
      : [...qcResult.rejectionReasons, reason]
    
    setQCResult({ ...qcResult, rejectionReasons: reasons })
  }

  const capturePhoto = () => {
    // Mock photo capture - in real implementation, use device camera
    const mockPhotoUrl = `photo-${Date.now()}.jpg`
    setQCResult({
      ...qcResult,
      photos: [...qcResult.photos, mockPhotoUrl]
    })
    setPhotoDialogOpen(false)
    toast.success("Photo captured successfully")
  }

  const removePhoto = (index: number) => {
    const newPhotos = qcResult.photos.filter((_, i) => i !== index)
    setQCResult({ ...qcResult, photos: newPhotos })
  }

  const submitQCResult = async () => {
    if (!currentInspection) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/qc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerDeliveryId: currentInspection.farmerDeliveryId,
          ...qcResult
        })
      })

      if (!response.ok) throw new Error("Failed to submit QC result")
      
      // Update inspection status
      setInspections(inspections.map(inspection => 
        inspection.id === currentInspection.id 
          ? { ...inspection, status: 'completed' as const }
          : inspection
      ))
      
      setCurrentInspection(null)
      setQCResult({
        productId: '',
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        rejectionReasons: [],
        photos: [],
        notes: ''
      })
      
      toast.success("QC inspection completed successfully")
    } catch (error) {
      // console.error("Error submitting QC result:", error)
      toast.error("Failed to submit QC result")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAcceptanceRate = () => {
    const total = qcResult.acceptedQuantity + qcResult.rejectedQuantity
    return total > 0 ? (qcResult.acceptedQuantity / total) * 100 : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAcceptanceRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-blue-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  // Tablet-optimized layout
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quality Control Station</h1>
          <p className="text-gray-600">Tablet-optimized interface for product inspection</p>
        </div>

        {!currentInspection ? (
          // Inspection List View
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {inspections.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No inspections pending</h3>
                <p className="text-gray-600">All deliveries have been processed</p>
              </div>
            ) : (
              inspections.map((inspection) => (
                <Card key={inspection.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{inspection.productName}</CardTitle>
                        <CardDescription>
                          {inspection.farmerName} • {inspection.farmName}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(inspection.status)}>
                        {inspection.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Expected Quantity</span>
                        <span className="font-medium">
                          {inspection.expectedQuantity} {inspection.unit}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(inspection.deliveryDate).toLocaleDateString()}
                      </div>
                      {inspection.status === 'pending' && (
                        <Button 
                          onClick={() => startInspection(inspection)}
                          className="w-full mt-4"
                          size="lg"
                        >
                          Start Inspection
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          // QC Inspection Interface
          <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentInspection(null)}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
              <div className="text-right">
                <h2 className="text-xl font-semibold">Inspecting: {currentInspection.productName}</h2>
                <p className="text-gray-600">{currentInspection.farmerName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Product Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{currentInspection.productName}</h3>
                    <p className="text-gray-600">
                      Expected: {currentInspection.expectedQuantity} {currentInspection.unit}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <div>
                      <p className="font-medium">{currentInspection.farmerName}</p>
                      <p className="text-sm text-gray-600">{currentInspection.farmName}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <p className="text-sm">
                      {new Date(currentInspection.deliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quantity Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Quantity Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="accepted" className="text-base font-medium">
                      Accepted Quantity
                    </Label>
                    <Input
                      id="accepted"
                      type="number"
                      min="0"
                      max={currentInspection.expectedQuantity}
                      value={qcResult.acceptedQuantity}
                      onChange={(e) => updateQuantity('acceptedQuantity', Number(e.target.value))}
                      className="text-lg h-12 mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="rejected" className="text-base font-medium">
                      Rejected Quantity
                    </Label>
                    <Input
                      id="rejected"
                      type="number"
                      min="0"
                      max={currentInspection.expectedQuantity}
                      value={qcResult.rejectedQuantity}
                      onChange={(e) => updateQuantity('rejectedQuantity', Number(e.target.value))}
                      className="text-lg h-12 mt-2"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getAcceptanceRateColor(getAcceptanceRate())}`}>
                        {getAcceptanceRate().toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Acceptance Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Issues */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Quality Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {REJECTION_REASONS.map((reason) => (
                      <div key={reason} className="flex items-center space-x-3">
                        <Checkbox
                          id={reason}
                          checked={qcResult.rejectionReasons.includes(reason)}
                          onCheckedChange={() => toggleRejectionReason(reason)}
                        />
                        <Label htmlFor={reason} className="text-sm font-medium cursor-pointer">
                          {reason}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Photos and Notes Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Photo Capture */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Camera className="w-5 h-5 mr-2" />
                      Photos ({qcResult.photos.length})
                    </span>
                    <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Camera className="w-4 h-4 mr-2" />
                          Capture
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Capture Photo</DialogTitle>
                          <DialogDescription>
                            Take a photo of the product for quality documentation
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
                            <Camera className="w-12 h-12 text-gray-400" />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={capturePhoto}>
                              Capture Photo
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qcResult.photos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <p>No photos captured</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {qcResult.photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <div className="bg-gray-200 h-24 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-600">{photo}</span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removePhoto(index)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={qcResult.notes}
                    onChange={(e) => setQCResult({ ...qcResult, notes: e.target.value })}
                    placeholder="Add any additional observations or comments..."
                    className="min-h-32"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Submit Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Ready to Submit?</h3>
                    <p className="text-sm text-gray-600">
                      Acceptance Rate: {getAcceptanceRate().toFixed(1)}% • 
                      {qcResult.rejectionReasons.length} issues identified • 
                      {qcResult.photos.length} photos captured
                    </p>
                  </div>
                  <Button
                    onClick={submitQCResult}
                    disabled={isSubmitting}
                    size="lg"
                    className="min-w-32"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Submit QC Result'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}