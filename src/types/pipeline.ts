import type { InterpolateParams, UpscaleParams } from '@/types/models'
import type { EncodeSettings } from '@/types/encoding'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'

export type TaskType = 'upscale' | 'interpolate'

export interface VideoInfo {
  path: string
  filename: string
  width: number
  height: number
  fps: number
  duration: number
  totalFrames: number
  codec: string
  bitrate: number
  audioCodec: string | null
  fileSize: number
}

export interface ProcessingTask {
  id: string
  type: TaskType
  status: ProcessingStatus
  inputPath: string
  outputPath: string
  progress: number
  currentFrame: number
  totalFrames: number
  eta: number
  startTime: number | null
  endTime: number | null
  error: string | null
  encodeSettings: EncodeSettings
  params: UpscaleParams | InterpolateParams
}
