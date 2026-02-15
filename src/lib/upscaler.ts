import { resolveResource } from '@tauri-apps/api/path'
import { exists, mkdir } from '@tauri-apps/plugin-fs'
import { Command } from '@tauri-apps/plugin-shell'

import { getShellCommandName } from '@/lib/ffmpeg'
import { getRecommendedNcnnRuntime } from '@/lib/gpu'
import type { UpscaleParams } from '@/types/models'

type UpscaleProgressCallback = (current: number, total: number) => void

let activeUpscaleChild: { kill: () => Promise<void> } | null = null

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

  const fractionMatch = line.match(/(\d+)\s*\/\s*(\d+)/)
  if (fractionMatch) {
    const current = Number(fractionMatch[1])
    const total = Number(fractionMatch[2])
    if (Number.isFinite(current) && Number.isFinite(total) && total > 0) {
      return { current: Math.min(current, total), total }
    }
  }

  return null
}

async function resolveModelDirectory(modelName: string): Promise<string> {
  const normalizedModelName = modelName.replace(/^models-/, '')
  const candidates = [
    `models/waifu2x-ncnn-vulkan/${modelName}`,
    `resources/models/waifu2x-ncnn-vulkan/${modelName}`,
    `models/${modelName}`,
    `resources/models/${modelName}`,
    `models/${normalizedModelName}`,
    `resources/models/${normalizedModelName}`,
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

  throw new Error(`Upscale model not found: ${modelName}. Checked: ${checked.join(', ')}`)
}

export async function cancelActiveUpscaleProcess(): Promise<void> {
  if (activeUpscaleChild) {
    await activeUpscaleChild.kill()
    activeUpscaleChild = null
  }
}

export async function runUpscale(
  inputDir: string,
  outputDir: string,
  params: UpscaleParams,
  onProgress?: UpscaleProgressCallback,
): Promise<void> {
  if (!(await exists(outputDir))) {
    await mkdir(outputDir, { recursive: true })
  }

  const recommendation = await getRecommendedNcnnRuntime(params.gpuId).catch(() => ({
    tileSize: 256,
    threadSpec: '1:2:2',
  }))
  const modelPath = await resolveModelDirectory(params.model)
  const tileSize = params.tileSize > 0 ? params.tileSize : recommendation.tileSize
  const manualThreadSpec = params.threadSpec.trim()
  const finalThreadSpec = manualThreadSpec || recommendation.threadSpec
  const threadArgs = hasArg(params.customArgs, '-j') || !finalThreadSpec ? [] : ['-j', finalThreadSpec]

  const args = [
    '-i',
    inputDir,
    '-o',
    outputDir,
    '-n',
    `${params.denoiseLevel}`,
    '-s',
    `${params.scale}`,
    '-t',
    `${tileSize}`,
    '-m',
    modelPath,
    '-f',
    params.format,
    ...getGpuArgs(params.gpuId),
    ...threadArgs,
    ...params.customArgs,
  ]

  const commandName = await getShellCommandName('waifu2x-ncnn-vulkan')
  const command = Command.create(commandName, args)
  command.stdout.on('data', (line) => {
    const parsed = parseProgressLine(line)
    if (parsed && onProgress) {
      onProgress(parsed.current, parsed.total)
    }
  })

  command.stderr.on('data', (line) => {
    const parsed = parseProgressLine(line)
    if (parsed && onProgress) {
      onProgress(parsed.current, parsed.total)
    }
  })

  activeUpscaleChild = await command.spawn()

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

  activeUpscaleChild = null

  if (result.code !== 0) {
    throw new Error(result.stderr || `waifu2x-ncnn-vulkan failed with code ${String(result.code)}`)
  }

  if (onProgress) {
    onProgress(100, 100)
  }
}
