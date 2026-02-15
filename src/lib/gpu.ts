import { Command } from '@tauri-apps/plugin-shell'

import { getShellCommandName } from '@/lib/ffmpeg'
import { listSystemGpus } from '@/lib/system-info'

export interface GpuDeviceInfo {
  id: number
  name: string
  vramMb: number | null
}

export interface NcnnRecommendation {
  tileSize: number
  threadSpec: string
}

export interface RifeRecommendation {
  threadSpec: string
}

let gpuDetectionPromise: Promise<GpuDeviceInfo[]> | null = null

function stripAnsi(text: string): string {
  let result = ''

  for (let index = 0; index < text.length; index += 1) {
    const charCode = text.charCodeAt(index)
    const nextChar = text[index + 1]

    if (charCode === 27 && nextChar === '[') {
      index += 2
      while (index < text.length) {
        const code = text.charCodeAt(index)
        if (code >= 64 && code <= 126) {
          break
        }
        index += 1
      }
      continue
    }

    result += text[index]
  }

  return result
}

function parseGpuDevicesFromNcnn(output: string): Array<{ id: number; name: string }> {
  const lines = stripAnsi(output).split(/\r?\n/)
  const devices = new Map<string, { id: number; name: string }>()

  for (const line of lines) {
    const match = line.trim().match(/^\[(\d+)\s+([^\]]+)\]/)
    if (!match) {
      continue
    }

    const id = Number(match[1])
    if (!Number.isFinite(id)) {
      continue
    }

    const name = match[2].trim()
    const key = `${id}:${name}`
    if (!devices.has(key)) {
      devices.set(key, { id, name })
    }
  }

  return [...devices.values()].sort((a, b) => a.id - b.id)
}

function normalizeGpuName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function resolveVramMb(
  ncnnName: string,
  systemGpus: Awaited<ReturnType<typeof listSystemGpus>>,
): number | null {
  const normalizedNcnn = normalizeGpuName(ncnnName)
  if (!normalizedNcnn) {
    return null
  }

  let exactMatch = systemGpus.find((gpu) => normalizeGpuName(gpu.name) === normalizedNcnn)
  if (exactMatch) {
    return exactMatch.vramMb
  }

  exactMatch = systemGpus.find((gpu) => {
    const normalizedSystem = normalizeGpuName(gpu.name)
    return normalizedSystem.includes(normalizedNcnn) || normalizedNcnn.includes(normalizedSystem)
  })
  return exactMatch?.vramMb ?? null
}

export function getNcnnRecommendationByVram(vramMb: number | null): NcnnRecommendation {
  if (!vramMb || vramMb <= 0) {
    return { tileSize: 256, threadSpec: '1:2:2' }
  }

  if (vramMb >= 16384) {
    return { tileSize: 512, threadSpec: '2:8:2' }
  }
  if (vramMb >= 12288) {
    return { tileSize: 384, threadSpec: '2:6:2' }
  }
  if (vramMb >= 8192) {
    return { tileSize: 320, threadSpec: '2:5:2' }
  }
  if (vramMb >= 6144) {
    return { tileSize: 256, threadSpec: '2:4:2' }
  }
  if (vramMb >= 4096) {
    return { tileSize: 192, threadSpec: '1:3:2' }
  }

  return { tileSize: 128, threadSpec: '1:2:2' }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getLogicalCpuCores(): number {
  const detected = typeof navigator === 'object' ? Number(navigator.hardwareConcurrency) : 0
  if (!Number.isFinite(detected) || detected <= 0) {
    return 8
  }
  return Math.trunc(detected)
}

export function getRifeRecommendationByVram(
  vramMb: number | null,
  options?: { uhd?: boolean },
): RifeRecommendation {
  const uhd = options?.uhd ?? false
  const cpuCores = getLogicalCpuCores()
  const maxProc = Math.max(2, cpuCores - (uhd ? 4 : 2))

  let procThreads = 4
  if (uhd) {
    if (vramMb && vramMb >= 12288) {
      procThreads = 4
    } else {
      procThreads = 3
    }
  } else if (!vramMb || vramMb <= 0) {
    procThreads = 6
  } else if (vramMb >= 16384) {
    procThreads = 8
  } else if (vramMb >= 12288) {
    procThreads = 7
  } else if (vramMb >= 8192) {
    procThreads = 6
  } else if (vramMb >= 6144) {
    procThreads = 5
  } else if (vramMb >= 4096) {
    procThreads = 4
  } else {
    procThreads = 3
  }

  const proc = clamp(procThreads, 2, maxProc)
  const load = clamp(uhd ? Math.ceil(proc / 2) : Math.ceil(proc / 1.8), 1, 6)
  const save = clamp(uhd ? Math.ceil(proc / 2) : Math.ceil(proc / 1.6), 2, 8)

  return {
    threadSpec: `${load}:${proc}:${save}`,
  }
}

function resolveTargetGpu(gpus: GpuDeviceInfo[], gpuId: number): GpuDeviceInfo | null {
  if (gpus.length === 0) {
    return null
  }

  if (gpuId >= 0) {
    return gpus.find((gpu) => gpu.id === gpuId) ?? null
  }

  const withVram = gpus.filter((gpu) => typeof gpu.vramMb === 'number')
  if (withVram.length === 0) {
    return gpus[0] ?? null
  }

  return withVram.sort((a, b) => (b.vramMb ?? 0) - (a.vramMb ?? 0))[0] ?? null
}

async function detectGpuDevicesInternal(): Promise<GpuDeviceInfo[]> {
  const commandName = await getShellCommandName('waifu2x-ncnn-vulkan')
  const output = await Command.create(commandName, [
    '-v',
    '-i',
    '__ai_video_gpu_probe_input__.png',
    '-o',
    '__ai_video_gpu_probe_output__.png',
    '-s',
    '1',
    '-n',
    '0',
  ]).execute()

  const text = `${output.stdout}\n${output.stderr}`
  const ncnnDevices = parseGpuDevicesFromNcnn(text)
  const systemGpus = await listSystemGpus().catch(() => [])

  return ncnnDevices.map((device) => ({
    ...device,
    vramMb: resolveVramMb(device.name, systemGpus),
  }))
}

export async function detectGpuDevices(forceRefresh = false): Promise<GpuDeviceInfo[]> {
  if (forceRefresh || !gpuDetectionPromise) {
    gpuDetectionPromise = detectGpuDevicesInternal().catch((error) => {
      gpuDetectionPromise = null
      throw error
    })
  }
  return gpuDetectionPromise
}

export async function getRecommendedNcnnRuntime(gpuId: number): Promise<NcnnRecommendation> {
  const gpus = await detectGpuDevices().catch(() => [])
  const target = resolveTargetGpu(gpus, gpuId)
  return getNcnnRecommendationByVram(target?.vramMb ?? null)
}

export async function getRecommendedRifeRuntime(
  gpuId: number,
  options?: { uhd?: boolean },
): Promise<RifeRecommendation> {
  const gpus = await detectGpuDevices().catch(() => [])
  const target = resolveTargetGpu(gpus, gpuId)
  return getRifeRecommendationByVram(target?.vramMb ?? null, options)
}
