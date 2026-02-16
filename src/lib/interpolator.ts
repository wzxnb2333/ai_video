import { resolveResource } from '@tauri-apps/api/path'
import { exists, mkdir, readDir } from '@tauri-apps/plugin-fs'
import { Command } from '@tauri-apps/plugin-shell'

import { getShellCommandName } from '@/lib/ffmpeg'
import { getRecommendedRifeRuntime } from '@/lib/gpu'
import type { InterpolateParams } from '@/types/models'

type InterpolateProgressCallback = (current: number, total: number) => void

let activeInterpolateChild: { kill: () => Promise<void> } | null = null

function isPathExists(path: string): Promise<boolean> {
  return exists(path).catch(() => false)
}

function toDevWorkspaceResourcePath(resolvedResourcePath: string, resourceRelativePath: string): string | null {
  const windowsMarker = '\\src-tauri\\target\\'
  const posixMarker = '/src-tauri/target/'
  const windowsIndex = resolvedResourcePath.indexOf(windowsMarker)
  const posixIndex = resolvedResourcePath.indexOf(posixMarker)

  if (windowsIndex >= 0) {
    const workspaceRoot = resolvedResourcePath.slice(0, windowsIndex)
    const relative = resourceRelativePath.replace(/\//g, '\\')
    return `${workspaceRoot}\\resources\\${relative}`
  }

  const markerIndex = posixIndex
  if (markerIndex < 0) {
    return null
  }

  const workspaceRoot = resolvedResourcePath.slice(0, markerIndex)
  return `${workspaceRoot}/resources/${resourceRelativePath}`
}

function getGpuArgs(gpuId: number): string[] {
  const normalized = Number.isFinite(gpuId) ? Math.trunc(gpuId) : 0
  if (normalized < 0) {
    return []
  }
  return ['-g', `${normalized}`]
}

function hasArg(customArgs: string[], flag: string): boolean {
  return customArgs.some((arg) => arg.trim() === flag)
}

function parseProgressLine(line: string): { current: number; total: number } | null {
  const percentMatch = line.match(/(\d+(?:\.\d+)?)%/)
  if (percentMatch) {
    const percentage = Math.min(100, Math.max(0, Math.round(Number(percentMatch[1]))))
    return { current: percentage, total: 100 }
  }

  return null
}

async function resolveModelDirectory(modelName: string): Promise<string> {
  const candidates = [
    `models/rife-ncnn-vulkan/${modelName}`,
    `resources/models/rife-ncnn-vulkan/${modelName}`,
    `models/${modelName}`,
    `resources/models/${modelName}`,
  ]
  const checked: string[] = []

  for (const candidate of candidates) {
    const resolved = await resolveResource(candidate)
    checked.push(resolved)
    if (await isPathExists(resolved)) {
      return resolved
    }

    const devWorkspacePath = toDevWorkspaceResourcePath(resolved, candidate)
    if (devWorkspacePath) {
      checked.push(devWorkspacePath)
      return devWorkspacePath
    }
  }

  throw new Error(`Interpolate model not found: ${modelName}. Checked: ${checked.join(', ')}`)
}

async function countInputFrames(inputDir: string): Promise<number> {
  const entries = await readDir(inputDir)
  return entries.filter((entry) => entry.isFile && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)).length
}

async function countOutputFrames(outputDir: string): Promise<number> {
  const entries = await readDir(outputDir)
  return entries.filter((entry) => entry.isFile && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)).length
}

export async function cancelActiveInterpolateProcess(): Promise<void> {
  if (activeInterpolateChild) {
    await activeInterpolateChild.kill()
    activeInterpolateChild = null
  }
}

export async function runInterpolate(
  inputDir: string,
  outputDir: string,
  params: InterpolateParams,
  onProgress?: InterpolateProgressCallback,
): Promise<void> {
  if (!(await exists(outputDir))) {
    await mkdir(outputDir, { recursive: true })
  }

  const recommendation = await getRecommendedRifeRuntime(params.gpuId, { uhd: params.uhd }).catch(() => ({
    threadSpec: params.uhd ? '2:3:2' : '3:6:4',
  }))
  const modelPath = await resolveModelDirectory(params.model)
  const inputFrames = await countInputFrames(inputDir)
  const targetFrames = inputFrames > 1 ? (inputFrames - 1) * params.multiplier + 1 : inputFrames
  const manualThreadSpec = params.threadSpec.trim()
  const finalThreadSpec = manualThreadSpec || recommendation.threadSpec
  const threadArgs = hasArg(params.customArgs, '-j') || !finalThreadSpec ? [] : ['-j', finalThreadSpec]

  const args = [
    '-i',
    inputDir,
    '-o',
    outputDir,
    '-m',
    modelPath,
    ...getGpuArgs(params.gpuId),
    '-n',
    `${Math.max(1, targetFrames)}`,
    '-f',
    'frame_%08d.png',
    ...threadArgs,
    ...params.customArgs,
  ]

  if (params.uhd) {
    args.push('-u')
  }

  const commandName = await getShellCommandName('rife-ncnn-vulkan')
  const command = Command.create(commandName, args)

  const expectedTotal = targetFrames > 0 ? targetFrames : 100
  let lastReported = 0

  command.stdout.on('data', (line) => {
    const parsed = parseProgressLine(line)
    if (parsed && onProgress) {
      const normalizedCurrent = parsed.total === 100 ? Math.round((parsed.current / 100) * expectedTotal) : parsed.current
      const normalizedTotal = parsed.total === 100 ? expectedTotal : parsed.total
      const boundedCurrent = Math.min(normalizedCurrent, normalizedTotal)
      if (boundedCurrent > lastReported) {
        lastReported = boundedCurrent
        onProgress(boundedCurrent, normalizedTotal)
      }
    }
  })

  command.stderr.on('data', (line) => {
    const parsed = parseProgressLine(line)
    if (parsed && onProgress) {
      const normalizedCurrent = parsed.total === 100 ? Math.round((parsed.current / 100) * expectedTotal) : parsed.current
      const normalizedTotal = parsed.total === 100 ? expectedTotal : parsed.total
      const boundedCurrent = Math.min(normalizedCurrent, normalizedTotal)
      if (boundedCurrent > lastReported) {
        lastReported = boundedCurrent
        onProgress(boundedCurrent, normalizedTotal)
      }
    }
  })

  activeInterpolateChild = await command.spawn()
  const pollInterval = setInterval(() => {
    if (!onProgress) {
      return
    }

    void countOutputFrames(outputDir)
      .then((count) => {
        const boundedCount = Math.min(count, expectedTotal)
        if (boundedCount > lastReported) {
          lastReported = boundedCount
          onProgress(boundedCount, expectedTotal)
        }
      })
      .catch(() => undefined)
  }, 1200)

  const result = await new Promise<{ code: number | null; stderr: string }>((resolveResult, rejectResult) => {
    const stderrParts: string[] = []

    command.stderr.on('data', (line) => {
      stderrParts.push(line)
    })

    command.on('error', (error) => {
      rejectResult(new Error(error))
    })

    command.on('close', (payload) => {
      resolveResult({ code: payload.code, stderr: stderrParts.join('\n') })
    })
  })

  activeInterpolateChild = null
  clearInterval(pollInterval)

  if (result.code !== 0) {
    throw new Error(result.stderr || `rife-ncnn-vulkan failed with code ${String(result.code)}`)
  }

  if (onProgress) {
    lastReported = expectedTotal
    onProgress(expectedTotal, expectedTotal)
  }
}
