'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  Scan,
  Upload,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { BarcodeService, CameraService, BarcodeResult } from '@/lib/hardware-integration'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (result: BarcodeResult) => void
  title?: string
  description?: string
  expectedFormat?: string
  allowManualEntry?: boolean
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = "Scan Barcode",
  description = "Position the barcode within the camera view",
  expectedFormat,
  allowManualEntry = true
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const [lastScan, setLastScan] = useState<BarcodeResult | null>(null)
  const [scanHistory, setScanHistory] = useState<BarcodeResult[]>([])
  const [manualCode, setManualCode] = useState('')

  const barcodeService = new BarcodeService()
  const cameraService = new CameraService()

  useEffect(() => {
    if (isOpen) {
      initializeScanner()
    } else {
      cleanup()
    }

    return cleanup
  }, [isOpen])

  const initializeScanner = async () => {
    try {
      // Check camera availability
      const cameraAvailable = await CameraService.isCameraAvailable()
      setHasCamera(cameraAvailable)

      if (cameraAvailable && videoRef.current) {
        // Initialize barcode service
        await barcodeService.initialize()
        
        // Start camera
        await cameraService.initializeCamera(videoRef.current)
        
        // Start scanning
        startScanning()
      }
    } catch (error) {
      // console.error('Scanner initialization error:', error)
      toast.error('Failed to initialize camera scanner')
    }
  }

  const startScanning = () => {
    if (!videoRef.current || isScanning) return

    setIsScanning(true)
    
    const stopScanning = barcodeService.startContinuousScanning(
      videoRef.current,
      handleScanResult,
      300 // Scan every 300ms
    )

    // Store stop function for cleanup
    ;(videoRef.current as any).stopScanning = stopScanning
  }

  const handleScanResult = (result: BarcodeResult) => {
    // Avoid duplicate scans
    if (lastScan && lastScan.data === result.data && 
        Date.now() - lastScan.timestamp < 2000) {
      return
    }

    setLastScan(result)
    setScanHistory(prev => [result, ...prev.slice(0, 4)]) // Keep last 5 scans

    // Validate format if specified
    if (expectedFormat && !result.data.includes(expectedFormat)) {
      toast.warning(`Expected ${expectedFormat} format, but scanned: ${result.data}`)
      return
    }

    // Success feedback
    toast.success('Barcode scanned successfully!')
    
    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate(100)
    }

    // Call parent handler
    onScan(result)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = await barcodeService.scanFromFile(file)
      if (result) {
        handleScanResult(result)
      } else {
        toast.error('No barcode found in the image')
      }
    } catch (error) {
      // console.error('File scan error:', error)
      toast.error('Failed to scan barcode from image')
    }

    // Reset file input
    event.target.value = ''
  }

  const handleManualEntry = () => {
    if (!manualCode.trim()) {
      toast.error('Please enter a barcode')
      return
    }

    const result: BarcodeResult = {
      data: manualCode.trim(),
      format: 'MANUAL_ENTRY',
      timestamp: Date.now()
    }

    handleScanResult(result)
    setManualCode('')
  }

  const cleanup = () => {
    setIsScanning(false)
    
    if (videoRef.current) {
      const stopScanning = (videoRef.current as any).stopScanning
      if (stopScanning) {
        stopScanning()
      }
    }
    
    cameraService.stopCamera()
    setLastScan(null)
    setScanHistory([])
  }

  const retryLastScan = () => {
    if (lastScan) {
      onScan(lastScan)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Scan className="w-5 h-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Scanner */}
          {hasCamera ? (
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-48 bg-black rounded-lg object-cover"
                    playsInline
                    muted
                  />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-white border-dashed w-48 h-24 rounded-lg animate-pulse" />
                  </div>
                  
                  {/* Status indicator */}
                  <div className="absolute top-2 right-2">
                    <Badge variant={isScanning ? "default" : "secondary"}>
                      {isScanning ? "Scanning..." : "Ready"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Camera not available. Use file upload or manual entry.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Alternative Input Methods */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setManualCode('')}
              className="flex items-center justify-center"
            >
              <Scan className="w-4 h-4 mr-2" />
              Manual Entry
            </Button>
          </div>

          {/* Manual Entry */}
          {allowManualEntry && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Manual Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter barcode manually..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualEntry()
                    }
                  }}
                />
                <Button
                  onClick={handleManualEntry}
                  disabled={!manualCode.trim()}
                  className="w-full"
                  size="sm"
                >
                  Submit Code
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Last Scan Result */}
          {lastScan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Last Scan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="bg-gray-50 p-2 rounded text-sm font-mono break-all">
                  {lastScan.data}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Format: {lastScan.format}</span>
                  <span>{new Date(lastScan.timestamp).toLocaleTimeString()}</span>
                </div>
                <Button
                  onClick={retryLastScan}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Use This Code
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Scan History */}
          {scanHistory.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {scanHistory.slice(1).map((scan, index) => (
                    <div
                      key={`${scan.timestamp}-${index}`}
                      className="flex items-center justify-between p-1 hover:bg-gray-50 rounded cursor-pointer text-xs"
                      onClick={() => onScan(scan)}
                    >
                      <span className="font-mono truncate flex-1 mr-2">
                        {scan.data}
                      </span>
                      <span className="text-gray-500">
                        {new Date(scan.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  )
}