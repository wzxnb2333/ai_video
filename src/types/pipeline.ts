import type { InterpolateParams, UpscaleParams, WorkflowOrderStrategy, WorkflowOutputMode } from '@/types/models'
import type { EncodeSettings } from '@/types/encoding'
import type { WorkflowOrder } from '@/lib/workflow'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'
export type ProcessingStage = 'extract' | 'process' | 'encode' | 'done' | null

export type TaskType = 'upscale' | 'interpolate' | 'workflow'

export interface WorkflowTaskParams {
  orderStrategy: WorkflowOrderStrategy
  resolvedOrder: WorkflowOrder | null
  outputMode: WorkflowOutputMode
  targetWidth: number
  targetHeight: number
  targetFps: number
  upscale: UpscaleParams
  interpolate: InterpolateParams
}

interface ProcessingTaskBase {
  id: string
  status: ProcessingStatus
  inputPath: string
  outputPath: string
  progress: number
  currentFrame: number
  totalFrames: number
  eta: number
  stage: ProcessingStage
  stageMessage: string
  startTime: number | null
  endTime: number | null
  error: string | null
  encodeSettings: EncodeSettings
}

export interface UpscaleProcessingTask extends ProcessingTaskBase {
  type: 'upscale'
  params: UpscaleParams
}

export interface InterpolateProcessingTask extends ProcessingTaskBase {
  type: 'interpolate'
  params: InterpolateParams
}

export interface WorkflowProcessingTask extends ProcessingTaskBase {
  type: 'workflow'
  params: WorkflowTaskParams
}

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

export type ProcessingTask =
  | UpscaleProcessingTask
  | InterpolateProcessingTask
  | WorkflowProcessingTask
