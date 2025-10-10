'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square,
  Trash2,
  Download,
  Volume2,
  VolumeX
} from 'lucide-react'
import { toast } from 'sonner'
import { AudioRecordingService, AudioRecording, RecordingState } from '@/lib/hardware-integration'

interface VoiceRecorderProps {
  onRecording: (recording: AudioRecording) => void
  onDelete?: (recordingId: string) => void
  maxDuration?: number // in seconds
  maxRecordings?: number
  title?: string
  description?: string
  className?: string
}

interface RecordingItem extends AudioRecording {
  id: string
  isPlaying: boolean
  currentTime: number
}

export function VoiceRecorder({
  onRecording,
  onDelete,
  maxDuration = 300, // 5 minutes default
  maxRecordings = 5,
  title = "Voice Notes",
  description = "Record audio observations",
  className = ''
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordings, setRecordings] = useState<RecordingItem[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  const audioRecordingService = useRef(new AudioRecordingService())
  const recordingTimer = useRef<NodeJS.Timeout | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrame = useRef<number | null>(null)

  useEffect(() => {
    checkMicrophonePermission()
    return () => {
      cleanup()
    }
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      const available = await AudioRecordingService.isAvailable()
      setHasPermission(available)
    } catch (error) {
      setHasPermission(false)
    }
  }

  const startRecording = async () => {
    if (recordings.length >= maxRecordings) {
      toast.error(`Maximum ${maxRecordings} recordings allowed`)
      return
    }

    try {
      await audioRecordingService.current.startRecording()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      // Start audio level monitoring
      startAudioLevelMonitoring()
      
      toast.success('Recording started')
    } catch (error) {
      // console.error('Recording start error:', error)
      toast.error('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = async () => {
    try {
      const recording = await audioRecordingService.current.stopRecording()
      
      const recordingItem: RecordingItem = {
        ...recording,
        id: `recording-${Date.now()}`,
        isPlaying: false,
        currentTime: 0
      }
      
      setRecordings(prev => [recordingItem, ...prev])
      onRecording(recording)
      
      setIsRecording(false)
      setRecordingTime(0)
      setAudioLevel(0)
      
      // Clear timer
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current)
        recordingTimer.current = null
      }
      
      // Stop audio monitoring
      stopAudioLevelMonitoring()
      
      toast.success('Recording saved')
    } catch (error) {
      // console.error('Recording stop error:', error)
      toast.error('Failed to save recording')
    }
  }

  const startAudioLevelMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      audioContext.current = new AudioContext()
      analyser.current = audioContext.current.createAnalyser()
      microphone.current = audioContext.current.createMediaStreamSource(stream)
      
      analyser.current.fftSize = 256
      microphone.current.connect(analyser.current)
      
      const dataArray = new Uint8Array(analyser.current.frequencyBinCount)
      
      const updateAudioLevel = () => {
        if (analyser.current && isRecording) {
          analyser.current.getByteFrequencyData(dataArray)
          
          // Calculate average volume
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          setAudioLevel(Math.min(100, (average / 128) * 100))
          
          animationFrame.current = requestAnimationFrame(updateAudioLevel)
        }
      }
      
      updateAudioLevel()
    } catch (error) {
      // console.error('Audio monitoring error:', error)
    }
  }

  const stopAudioLevelMonitoring = () => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
    
    if (microphone.current) {
      microphone.current.disconnect()
      microphone.current = null
    }
    
    if (audioContext.current) {
      audioContext.current.close()
      audioContext.current = null
    }
    
    analyser.current = null
  }

  const playRecording = (recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId)
    if (!recording) return

    const audio = new Audio(URL.createObjectURL(recording.file))
    
    audio.onplay = () => {
      setRecordings(prev => prev.map(r => 
        r.id === recordingId ? { ...r, isPlaying: true } : { ...r, isPlaying: false }
      ))
    }
    
    audio.onpause = () => {
      setRecordings(prev => prev.map(r => 
        r.id === recordingId ? { ...r, isPlaying: false } : r
      ))
    }
    
    audio.onended = () => {
      setRecordings(prev => prev.map(r => 
        r.id === recordingId ? { ...r, isPlaying: false, currentTime: 0 } : r
      ))
    }
    
    audio.ontimeupdate = () => {
      setRecordings(prev => prev.map(r => 
        r.id === recordingId ? { ...r, currentTime: audio.currentTime } : r
      ))
    }
    
    if (recording.isPlaying) {
      audio.pause()
    } else {
      // Pause other recordings
      setRecordings(prev => prev.map(r => ({ ...r, isPlaying: false })))
      audio.play()
    }
  }

  const deleteRecording = (recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId))
    if (onDelete) {
      onDelete(recordingId)
    }
    toast.success('Recording deleted')
  }

  const downloadRecording = (recording: RecordingItem) => {
    const url = URL.createObjectURL(recording.file)
    const link = document.createElement('a')
    link.href = url
    link.download = `voice-note-${recording.timestamp}.webm`
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const cleanup = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current)
    }
    stopAudioLevelMonitoring()
  }

  if (hasPermission === false) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <VolumeX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Microphone Not Available</h3>
          <p className="text-gray-600 mb-4">
            Please check your microphone permissions and try again.
          </p>
          <Button onClick={checkMicrophonePermission} variant="outline">
            Check Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Volume2 className="w-5 h-5 mr-2" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="text-center space-y-4">
          {isRecording ? (
            <div className="space-y-4">
              {/* Recording Indicator */}
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-lg font-mono font-bold text-red-600">
                  {formatTime(recordingTime)}
                </span>
                <span className="text-sm text-gray-500">
                  / {formatTime(maxDuration)}
                </span>
              </div>
              
              {/* Audio Level Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Mic className="w-4 h-4 text-gray-600" />
                  <Progress value={audioLevel} className="w-32" />
                  <span className="text-xs text-gray-500">{Math.round(audioLevel)}%</span>
                </div>
              </div>
              
              {/* Stop Button */}
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
              >
                <Square className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Start Recording Button */}
              <Button
                onClick={startRecording}
                disabled={hasPermission === null || recordings.length >= maxRecordings}
                size="lg"
                className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
              >
                <Mic className="w-6 h-6" />
              </Button>
              
              {recordings.length >= maxRecordings && (
                <p className="text-sm text-amber-600">
                  Maximum recordings reached. Delete some to record more.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recordings List */}
        {recordings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Recordings ({recordings.length})</h4>
              <Badge variant="secondary">{recordings.length}/{maxRecordings}</Badge>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Play/Pause Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playRecording(recording.id)}
                    className="flex-shrink-0"
                  >
                    {recording.isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {/* Recording Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        Voice Note {recordings.indexOf(recording) + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(recording.file.size)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTime(recording.currentTime)} / {formatTime(recording.duration / 1000)}
                      </span>
                      <div className="flex-1">
                        <Progress 
                          value={(recording.currentTime / (recording.duration / 1000)) * 100} 
                          className="h-1"
                        />
                      </div>
                    </div>
                    
                    <span className="text-xs text-gray-400">
                      {new Date(recording.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadRecording(recording)}
                      className="flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecording(recording.id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recording Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Hold device close to your mouth for best quality</p>
          <p>• Speak clearly and avoid background noise</p>
          <p>• Maximum recording time: {formatTime(maxDuration)}</p>
        </div>
      </CardContent>
    </Card>
  )
}