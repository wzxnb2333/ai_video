import { useEffect, useMemo } from 'react'

import { cancelProcessingTask, ensureProcessingRunner } from '@/lib/processing-runner'
import { useProcessingStore } from '@/stores/processing.store'
import { useSettingsStore } from '@/stores/settings.store'
import type { EncodeSettings } from '@/types/encoding'
import type { InterpolateParams, UpscaleParams } from '@/types/models'
import type { ProcessingTask } from '@/types/pipeline'

const createTaskId = (type: 'upscale' | 'interpolate'): string => {
  return `${type}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

const joinPath = (directory: string, fileName: string): string => {
  if (!directory) {
    return fileName
  }

  const separator = directory.includes('\\') ? '\\' : '/'
  const cleanedDirectory = directory.endsWith('\\') || directory.endsWith('/')
    ? directory.slice(0, -1)
    : directory
  return `${cleanedDirectory}${separator}${fileName}`
}

const toOutputPath = (inputPath: string, suffix: string, outputDirectory: string): string => {
  const normalized = inputPath.replace(/\\/g, '/').split('/')
  const filename = normalized[normalized.length - 1] ?? 'video.mp4'
  const dotIndex = filename.lastIndexOf('.')
  const baseName = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  const outputFile = `${baseName}-${suffix}.mp4`

  if (outputDirectory.trim().length > 0) {
    return joinPath(outputDirectory.trim(), outputFile)
  }

  const slashIndex = inputPath.lastIndexOf('/')
  const backslashIndex = inputPath.lastIndexOf('\\')
  const lastSeparatorIndex = Math.max(slashIndex, backslashIndex)
  const sourceDirectory = lastSeparatorIndex >= 0 ? inputPath.slice(0, lastSeparatorIndex) : ''
  if (sourceDirectory) {
    return joinPath(sourceDirectory, outputFile)
  }

  return outputFile
}

const createBaseTask = (
  type: 'upscale' | 'interpolate',
  inputPath: string,
  params: UpscaleParams | InterpolateParams,
  encodeSettings: EncodeSettings,
  outputDirectory: string,
): ProcessingTask => {
  return {
    id: createTaskId(type),
    type,
    status: 'pending',
    inputPath,
    outputPath: toOutputPath(inputPath, type, outputDirectory),
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    eta: 0,
    startTime: null,
    endTime: null,
    error: null,
    encodeSettings,
    params,
  }
}

export function useProcessing(): {
  tasks: ProcessingTask[]
  activeTask: ProcessingTask | null
  addUpscaleTask: (inputPath: string) => void
  addInterpolateTask: (inputPath: string) => void
  cancelTask: (id: string) => void
  clearCompleted: () => void
} {
  const tasks = useProcessingStore((state) => state.tasks)
  const activeTaskId = useProcessingStore((state) => state.activeTaskId)
  const addTask = useProcessingStore((state) => state.addTask)
  const clearCompleted = useProcessingStore((state) => state.clearCompleted)

  const upscaleParams = useSettingsStore((state) => state.upscaleParams)
  const interpolateParams = useSettingsStore((state) => state.interpolateParams)
  const encodeSettings = useSettingsStore((state) => state.encodeSettings)
  const outputDirectory = useSettingsStore((state) => state.outputDirectory)

  useEffect(() => {
    ensureProcessingRunner()
  }, [])

  const activeTask = useMemo(() => {
    if (!activeTaskId) {
      return null
    }
    return tasks.find((task) => task.id === activeTaskId) ?? null
  }, [activeTaskId, tasks])

  const addUpscaleTask = (inputPath: string): void => {
    addTask(createBaseTask('upscale', inputPath, upscaleParams, encodeSettings, outputDirectory))
  }

  const addInterpolateTask = (inputPath: string): void => {
    addTask(createBaseTask('interpolate', inputPath, interpolateParams, encodeSettings, outputDirectory))
  }

  const cancelTask = (id: string): void => {
    void cancelProcessingTask(id)
  }

  return {
    tasks,
    activeTask,
    addUpscaleTask,
    addInterpolateTask,
    cancelTask,
    clearCompleted,
  }
}
