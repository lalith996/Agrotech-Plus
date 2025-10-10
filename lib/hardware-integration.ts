// Hardware integration service for QC tablet interface

export interface CameraCapture {
  file: File;
  dataUrl: string;
  metadata: {
    timestamp: number;
    deviceInfo: string;
    resolution: {
      width: number;
      height: number;
    };
  };
}

export interface BarcodeResult {
  data: string;
  format: string;
  timestamp: number;
  confidence?: number;
}

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface AudioRecording {
  file: File;
  duration: number;
  timestamp: number;
  deviceInfo: string;
}

export class CameraService {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Initialize camera with optimal settings for QC
   */
  async initializeCamera(videoElement?: HTMLVideoElement): Promise<MediaStream> {
    try {
      // Request camera with high quality settings
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: { ideal: 'environment' }, // Prefer back camera
          // focusMode: { ideal: 'continuous' }, // Not supported in standard MediaTrackConstraints
          // exposureMode: { ideal: 'continuous' }, // Not supported in standard MediaTrackConstraints
          // whiteBalanceMode: { ideal: 'continuous' } // Not supported in standard MediaTrackConstraints
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoElement) {
        this.video = videoElement;
        this.video.srcObject = this.stream;
        await this.video.play();
      }

      return this.stream;
    } catch (error) {
      // console.error('Camera initialization error:', error);
      throw new Error('Failed to access camera. Please check permissions.');
    }
  }

  /**
   * Capture photo from camera stream
   */
  async capturePhoto(videoElement?: HTMLVideoElement): Promise<CameraCapture> {
    const video = videoElement || this.video;
    
    if (!video) {
      throw new Error('Camera not initialized');
    }

    // Create canvas for capture
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    const canvas = this.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and file
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to capture image'));
          return;
        }

        const timestamp = Date.now();
        const filename = `qc-photo-${timestamp}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        const capture: CameraCapture = {
          file,
          dataUrl,
          metadata: {
            timestamp,
            deviceInfo: navigator.userAgent,
            resolution: {
              width: canvas.width,
              height: canvas.height
            }
          }
        };

        resolve(capture);
      }, 'image/jpeg', 0.9);
    });
  }

  /**
   * Stop camera stream
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  /**
   * Check if camera is available
   */
  static async isCameraAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available cameras
   */
  static async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      // console.error('Error getting cameras:', error);
      return [];
    }
  }
}

export class BarcodeService {
  private worker: Worker | null = null;

  /**
   * Initialize barcode scanner
   */
  async initialize(): Promise<void> {
    // Check if jsQR is available
    if (typeof window !== 'undefined' && !(window as any).jsQR) {
      // Dynamically load jsQR library
      await this.loadJsQR();
    }
  }

  /**
   * Scan barcode from image data
   */
  async scanFromImageData(imageData: ImageData): Promise<BarcodeResult | null> {
    try {
      const jsQR = (window as any).jsQR;
      if (!jsQR) {
        throw new Error('jsQR library not loaded');
      }

      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        return {
          data: code.data,
          format: 'QR_CODE', // jsQR only handles QR codes
          timestamp: Date.now(),
          confidence: 1.0
        };
      }

      return null;
    } catch (error) {
      // console.error('Barcode scanning error:', error);
      return null;
    }
  }

  /**
   * Scan barcode from video stream
   */
  async scanFromVideo(videoElement: HTMLVideoElement): Promise<BarcodeResult | null> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return await this.scanFromImageData(imageData);
  }

  /**
   * Scan barcode from file
   */
  async scanFromFile(file: File): Promise<BarcodeResult | null> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = await this.scanFromImageData(imageData);
        resolve(result);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Start continuous scanning from video
   */
  startContinuousScanning(
    videoElement: HTMLVideoElement,
    onScan: (result: BarcodeResult) => void,
    interval: number = 500
  ): () => void {
    let isScanning = true;
    
    const scan = async () => {
      if (!isScanning) return;
      
      try {
        const result = await this.scanFromVideo(videoElement);
        if (result) {
          onScan(result);
        }
      } catch (error) {
        // console.error('Continuous scan error:', error);
      }
      
      if (isScanning) {
        setTimeout(scan, interval);
      }
    };

    scan();

    return () => {
      isScanning = false;
    };
  }

  private async loadJsQR(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load jsQR'));
      document.head.appendChild(script);
    });
  }
}

export class GeolocationService {
  private watchId: number | null = null;

  /**
   * Get current position with high accuracy
   */
  async getCurrentPosition(): Promise<GeolocationResult> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result: GeolocationResult = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp
          };
          resolve(result);
        },
        (error) => {
          let message = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  }

  /**
   * Watch position changes
   */
  watchPosition(
    onUpdate: (position: GeolocationResult) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000 // 30 seconds
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const result: GeolocationResult = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp
        };
        onUpdate(result);
      },
      (error) => {
        if (onError) {
          onError(new Error(`Geolocation error: ${error.message}`));
        }
      },
      options
    );

    return () => {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
    };
  }

  /**
   * Check if geolocation is available
   */
  static isAvailable(): boolean {
    return 'geolocation' in navigator;
  }
}

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: BlobPart[] = [];

  /**
   * Start audio recording
   */
  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
    } catch (error) {
      // console.error('Audio recording error:', error);
      throw new Error('Failed to start audio recording. Please check microphone permissions.');
    }
  }

  /**
   * Stop audio recording and return file
   */
  async stopRecording(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.stream) {
        reject(new Error('Recording not started'));
        return;
      }

      const startTime = Date.now();

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        const duration = Date.now() - startTime;
        const timestamp = Date.now();
        const filename = `audio-note-${timestamp}.webm`;
        const file = new File([blob], filename, { type: 'audio/webm' });

        const recording: AudioRecording = {
          file,
          duration,
          timestamp,
          deviceInfo: navigator.userAgent
        };

        // Clean up
        this.stream!.getTracks().forEach(track => track.stop());
        this.stream = null;
        this.mediaRecorder = null;
        this.chunks = [];

        resolve(recording);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if audio recording is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'audioinput');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get recording state
   */
  getState(): RecordingState {
    if (!this.mediaRecorder) {
      return RecordingState.INACTIVE;
    }
    return this.mediaRecorder.state as RecordingState;
  }
}

export enum RecordingState {
  INACTIVE = 'inactive',
  RECORDING = 'recording',
  PAUSED = 'paused'
}

// Hardware capabilities checker
export class HardwareCapabilities {
  static async checkAll(): Promise<{
    camera: boolean;
    microphone: boolean;
    geolocation: boolean;
    storage: boolean;
  }> {
    const [camera, microphone, geolocation, storage] = await Promise.all([
      CameraService.isCameraAvailable(),
      AudioRecordingService.isAvailable(),
      Promise.resolve(GeolocationService.isAvailable()),
      this.checkStorageAvailable()
    ]);

    return {
      camera,
      microphone,
      geolocation,
      storage
    };
  }

  private static async checkStorageAvailable(): Promise<boolean> {
    try {
      return 'indexedDB' in window && 'localStorage' in window;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instances
export const cameraService = new CameraService();
export const barcodeService = new BarcodeService();
export const geolocationService = new GeolocationService();
export const audioRecordingService = new AudioRecordingService();