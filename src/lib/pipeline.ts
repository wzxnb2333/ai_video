import { join, tempDir } from '@tauri-apps/api/path'
import { mkdir, remove } from '@tauri-apps/plugin-fs'

import { cancelActiveFfmpegProcess, encodeVideo, extractFrames, getVideoInfo } from '@/lib/ffmpeg'
import { cancelActiveInterpolateProcess, runInterpolate } from '@/lib/interpolator'
import { cancelActiveUpscaleProcess, runUpscale } from '@/lib/upscaler'
import { getWorkflowOrderLabel, resolveWorkflowPlan } from '@/lib/workflow'
import type { InterpolateParams, UpscaleParams } from '@/types/models'
import type { ProcessingTask, WorkflowTaskParams } from '@/types/pipeline'

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

function isWorkflowTask(task: ProcessingTask): task is ProcessingTask & { params: WorkflowTaskParams } {
  return task.type === 'workflow'
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

function stripCustomThreadArgs(customArgs: string[]): string[] {
  const sanitized: string[] = []
  for (let index = 0; index < customArgs.length; index += 1) {
    const arg = customArgs[index]
    if (arg === '-j') {
      index += 1
      continue
    }
    sanitized.push(arg)
  }
  return sanitized
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
        const extractWeight = isWorkflowTask(task) ? 20 : 25
        const overallProgress = stageRatio * extractWeight

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

      let outputFps = sourceInfo.fps
      let encodeOptions: { targetWidth?: number | null; targetHeight?: number | null; targetFps?: number | null } | undefined

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
        outputFps = sourceInfo.fps * task.params.multiplier
      } else if (isWorkflowTask(task)) {
        const intermediateDir = await join(taskTempDir, 'frames_mid')
        await mkdir(intermediateDir, { recursive: true })

        const workflowPlan = resolveWorkflowPlan(
          {
            width: sourceInfo.width,
            height: sourceInfo.height,
            fps: sourceInfo.fps,
            totalFrames: sourceInfo.totalFrames,
          },
          task.params,
        )

        const totalSteps = workflowPlan.steps.length
        const processWeightPerStep = 70 / Math.max(1, totalSteps)
        let stepInputDir = extractedDir

        for (let stepIndex = 0; stepIndex < workflowPlan.steps.length; stepIndex += 1) {
          const stepType = workflowPlan.steps[stepIndex]
          const stepOutputDir = stepIndex === workflowPlan.steps.length - 1 ? processedDir : intermediateDir
          const stepLabel = stepType === 'upscale' ? 'Upscale' : 'Interpolate'
          const stepMessage = `Workflow step ${stepIndex + 1}/${totalSteps}: ${getWorkflowOrderLabel(workflowPlan.order, 'en-US')} (${stepLabel})`

          if (stepType === 'upscale') {
            await runUpscale(stepInputDir, stepOutputDir, workflowPlan.upscaleParams, (current, total) => {
              const boundedTotal = Math.max(1, total)
              const stageRatio = Math.min(current / boundedTotal, 1)
              const overallProgress = 20 + stepIndex * processWeightPerStep + stageRatio * processWeightPerStep

              emit({
                stage: 'process',
                progress: overallProgress,
                currentFrame: current,
                totalFrames: boundedTotal,
                eta: calculateEta(startedAt, overallProgress),
                message: stepMessage,
              })
            })
          } else {
            const interpolateParamsForRun: InterpolateParams =
              workflowPlan.order === 'upscale-first' && stepIndex > 0
                ? {
                    ...workflowPlan.interpolateParams,
                    uhd: true,
                    threadSpec: '',
                    customArgs: stripCustomThreadArgs(workflowPlan.interpolateParams.customArgs),
                  }
                : workflowPlan.interpolateParams

            await runInterpolate(stepInputDir, stepOutputDir, interpolateParamsForRun, (current, total) => {
              const boundedTotal = Math.max(1, total)
              const stageRatio = Math.min(current / boundedTotal, 1)
              const overallProgress = 20 + stepIndex * processWeightPerStep + stageRatio * processWeightPerStep

              emit({
                stage: 'process',
                progress: overallProgress,
                currentFrame: current,
                totalFrames: boundedTotal,
                eta: calculateEta(startedAt, overallProgress),
                message: stepMessage,
              })
            })
          }

          ensureNotCancelled()
          stepInputDir = stepOutputDir
        }

        outputFps = workflowPlan.sequenceFps
        encodeOptions = {
          targetWidth: workflowPlan.outputWidth,
          targetHeight: workflowPlan.outputHeight,
          targetFps: workflowPlan.outputFps,
        }
      }

      ensureNotCancelled()

      await encodeVideo(processedDir, task.outputPath, outputFps, task.inputPath, task.encodeSettings, (current, total) => {
        const boundedTotal = Math.max(1, total)
        const stageRatio = Math.min(current / boundedTotal, 1)
        const encodeBase = isWorkflowTask(task) ? 90 : 85
        const encodeWeight = isWorkflowTask(task) ? 10 : 15
        const overallProgress = encodeBase + stageRatio * encodeWeight

        emit({
          stage: 'encode',
          progress: overallProgress,
          currentFrame: current,
          totalFrames: boundedTotal,
          eta: calculateEta(startedAt, overallProgress),
          message: 'Encoding final video',
        })
      }, encodeOptions)

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
