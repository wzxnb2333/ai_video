import { join, tempDir } from '@tauri-apps/api/path'
import { mkdir, remove } from '@tauri-apps/plugin-fs'

import { cancelActiveFfmpegProcess, encodeVideo, extractFrames, getVideoInfo } from '@/lib/ffmpeg'
import { cancelActiveInterpolateProcess, runInterpolate } from '@/lib/interpolator'
import { cancelActiveUpscaleProcess, runUpscale } from '@/lib/upscaler'
import type { InterpolateParams, UpscaleParams } from '@/types/models'
import type { ProcessingTask } from '@/types/pipeline'

export interface PipelineProgress {
  stage: 'extract' | 'process' | 'encode' | 'done'
  progress: number
  currentFrame: number
  totalFrames: number
  eta: number
  message: string
}

type ProgressListener = (progress: PipelineProgress) => void

function isInterpolateTask(task: ProcessingTask): task is ProcessingTask & { params: InterpolateParams } {
  return task.type === 'interpolate'
}

function isUpscaleTask(task: ProcessingTask): task is ProcessingTask & { params: UpscaleParams } {
  return task.type === 'upscale'
}

function calculateEta(startedAtMs: number, progress: number): number {
  if (progress <= 0) {
    return 0
  }

  const elapsedSec = (Date.now() - startedAtMs) / 1000
  const totalSecEstimate = elapsedSec / (progress / 100)
  const eta = Math.max(0, Math.round(totalSecEstimate - elapsedSec))
  return Number.isFinite(eta) ? eta : 0
}

export class ProcessingPipeline {
  private progressListeners = new Set<ProgressListener>()
  private cancelled = false
  private running = false

  onProgress(callback: ProgressListener): () => void {
    this.progressListeners.add(callback)
    return () => {
      this.progressListeners.delete(callback)
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true

    await Promise.all([
      cancelActiveFfmpegProcess(),
      cancelActiveUpscaleProcess(),
      cancelActiveInterpolateProcess(),
    ])
  }

  async start(task: ProcessingTask): Promise<void> {
    if (this.running) {
      throw new Error('ProcessingPipeline is already running')
    }

    this.running = true
    this.cancelled = false

    const startedAt = Date.now()
    const tempBase = await tempDir()
    const taskTempDir = await join(tempBase, `ai-video-${task.id}-${startedAt}`)
    const extractedDir = await join(taskTempDir, 'frames_in')
    const processedDir = await join(taskTempDir, 'frames_out')

    const emit = (payload: PipelineProgress): void => {
      this.progressListeners.forEach((listener) => listener(payload))
    }

    const ensureNotCancelled = (): void => {
      if (this.cancelled) {
        throw new Error('Processing cancelled')
      }
    }

    try {
      await mkdir(taskTempDir, { recursive: true })
      await mkdir(extractedDir, { recursive: true })
      await mkdir(processedDir, { recursive: true })

      const sourceInfo = await getVideoInfo(task.inputPath)
      const inputTotalFrames = Math.max(1, sourceInfo.totalFrames)

      emit({
        stage: 'extract',
        progress: 0,
        currentFrame: 0,
        totalFrames: inputTotalFrames,
        eta: 0,
        message: 'Extracting source frames',
      })

      await extractFrames(task.inputPath, extractedDir, (current, total) => {
        const boundedTotal = Math.max(1, total)
        const stageRatio = Math.min(current / boundedTotal, 1)
        const overallProgress = stageRatio * 25

        emit({
          stage: 'extract',
          progress: overallProgress,
          currentFrame: current,
          totalFrames: boundedTotal,
          eta: calculateEta(startedAt, overallProgress),
          message: 'Extracting source frames',
        })
      })

      ensureNotCancelled()

      if (isUpscaleTask(task)) {
        await runUpscale(extractedDir, processedDir, task.params, (current, total) => {
          const boundedTotal = Math.max(1, total)
          const stageRatio = Math.min(current / boundedTotal, 1)
          const overallProgress = 25 + stageRatio * 60

          emit({
            stage: 'process',
            progress: overallProgress,
            currentFrame: current,
            totalFrames: boundedTotal,
            eta: calculateEta(startedAt, overallProgress),
            message: 'Upscaling frames with waifu2x',
          })
        })
      } else if (isInterpolateTask(task)) {
        await runInterpolate(extractedDir, processedDir, task.params, (current, total) => {
          const boundedTotal = Math.max(1, total)
          const stageRatio = Math.min(current / boundedTotal, 1)
          const overallProgress = 25 + stageRatio * 60

          emit({
            stage: 'process',
            progress: overallProgress,
            currentFrame: current,
            totalFrames: boundedTotal,
            eta: calculateEta(startedAt, overallProgress),
            message: 'Interpolating frames with RIFE',
          })
        })
      }

      ensureNotCancelled()

      const outputFps = isInterpolateTask(task) ? sourceInfo.fps * task.params.multiplier : sourceInfo.fps

      await encodeVideo(processedDir, task.outputPath, outputFps, task.inputPath, task.encodeSettings, (current, total) => {
        const boundedTotal = Math.max(1, total)
        const stageRatio = Math.min(current / boundedTotal, 1)
        const overallProgress = 85 + stageRatio * 15

        emit({
          stage: 'encode',
          progress: overallProgress,
          currentFrame: current,
          totalFrames: boundedTotal,
          eta: calculateEta(startedAt, overallProgress),
          message: 'Encoding final video',
        })
      })

      ensureNotCancelled()

      emit({
        stage: 'done',
        progress: 100,
        currentFrame: 1,
        totalFrames: 1,
        eta: 0,
        message: 'Processing complete',
      })
    } finally {
      this.running = false
      await remove(taskTempDir, { recursive: true }).catch(() => undefined)
    }
  }
}
