import { basename, resolveResource, sep } from '@tauri-apps/api/path'
import { exists, mkdir, readDir } from '@tauri-apps/plugin-fs'
import { Command } from '@tauri-apps/plugin-shell'

import type { EncodeSettings } from '@/types/encoding'
import type { VideoInfo } from '@/types/pipeline'

type ProgressCallback = (current: number, total: number) => void

interface FfprobeStream {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  r_frame_rate?: string
  avg_frame_rate?: string
  nb_frames?: string
}

interface FfprobeFormat {
  duration?: string
  bit_rate?: string
  size?: string
}

interface FfprobeOutput {
  streams?: FfprobeStream[]
  format?: FfprobeFormat
}

let activeFfmpegChild: { kill: () => Promise<void> } | null = null

const FRAME_REGEX = /frame=\s*(\d+)/

interface ShellCommandCandidate {
  commandName: string
  resourcePath: string
}

type ShellBinaryName = 'ffmpeg' | 'ffprobe' | 'waifu2x-ncnn-vulkan' | 'rife-ncnn-vulkan'

const SHELL_COMMAND_CANDIDATES: Record<ShellBinaryName, ShellCommandCandidate[]> = {
  ffmpeg: [
    { commandName: 'ffmpeg-models-ffmpeg', resourcePath: 'models/ffmpeg/ffmpeg' },
    { commandName: 'ffmpeg-models-ffmpeg-exe', resourcePath: 'models/ffmpeg/ffmpeg.exe' },
    { commandName: 'ffmpeg-resources-models-ffmpeg', resourcePath: 'resources/models/ffmpeg/ffmpeg' },
    { commandName: 'ffmpeg-resources-models-ffmpeg-exe', resourcePath: 'resources/models/ffmpeg/ffmpeg.exe' },
    { commandName: 'ffmpeg-models-flat', resourcePath: 'models/ffmpeg' },
    { commandName: 'ffmpeg-models-flat-exe', resourcePath: 'models/ffmpeg.exe' },
    { commandName: 'ffmpeg-resources-models-flat', resourcePath: 'resources/models/ffmpeg' },
    { commandName: 'ffmpeg-resources-models-flat-exe', resourcePath: 'resources/models/ffmpeg.exe' },
  ],
  ffprobe: [
    { commandName: 'ffprobe-models-ffmpeg', resourcePath: 'models/ffmpeg/ffprobe' },
    { commandName: 'ffprobe-models-ffmpeg-exe', resourcePath: 'models/ffmpeg/ffprobe.exe' },
    { commandName: 'ffprobe-resources-models-ffmpeg', resourcePath: 'resources/models/ffmpeg/ffprobe' },
    { commandName: 'ffprobe-resources-models-ffmpeg-exe', resourcePath: 'resources/models/ffmpeg/ffprobe.exe' },
    { commandName: 'ffprobe-models-flat', resourcePath: 'models/ffprobe' },
    { commandName: 'ffprobe-models-flat-exe', resourcePath: 'models/ffprobe.exe' },
    { commandName: 'ffprobe-resources-models-flat', resourcePath: 'resources/models/ffprobe' },
    { commandName: 'ffprobe-resources-models-flat-exe', resourcePath: 'resources/models/ffprobe.exe' },
  ],
  'waifu2x-ncnn-vulkan': [
    { commandName: 'waifu2x-models-nested', resourcePath: 'models/waifu2x-ncnn-vulkan/waifu2x-ncnn-vulkan' },
    { commandName: 'waifu2x-models-nested-exe', resourcePath: 'models/waifu2x-ncnn-vulkan/waifu2x-ncnn-vulkan.exe' },
    { commandName: 'waifu2x-resources-models-nested', resourcePath: 'resources/models/waifu2x-ncnn-vulkan/waifu2x-ncnn-vulkan' },
    { commandName: 'waifu2x-resources-models-nested-exe', resourcePath: 'resources/models/waifu2x-ncnn-vulkan/waifu2x-ncnn-vulkan.exe' },
    { commandName: 'waifu2x-models-flat', resourcePath: 'models/waifu2x-ncnn-vulkan' },
    { commandName: 'waifu2x-models-flat-exe', resourcePath: 'models/waifu2x-ncnn-vulkan.exe' },
    { commandName: 'waifu2x-resources-models-flat', resourcePath: 'resources/models/waifu2x-ncnn-vulkan' },
    { commandName: 'waifu2x-resources-models-flat-exe', resourcePath: 'resources/models/waifu2x-ncnn-vulkan.exe' },
  ],
  'rife-ncnn-vulkan': [
    { commandName: 'rife-models-nested', resourcePath: 'models/rife-ncnn-vulkan/rife-ncnn-vulkan' },
    { commandName: 'rife-models-nested-exe', resourcePath: 'models/rife-ncnn-vulkan/rife-ncnn-vulkan.exe' },
    { commandName: 'rife-resources-models-nested', resourcePath: 'resources/models/rife-ncnn-vulkan/rife-ncnn-vulkan' },
    { commandName: 'rife-resources-models-nested-exe', resourcePath: 'resources/models/rife-ncnn-vulkan/rife-ncnn-vulkan.exe' },
    { commandName: 'rife-models-flat', resourcePath: 'models/rife-ncnn-vulkan' },
    { commandName: 'rife-models-flat-exe', resourcePath: 'models/rife-ncnn-vulkan.exe' },
    { commandName: 'rife-resources-models-flat', resourcePath: 'resources/models/rife-ncnn-vulkan' },
    { commandName: 'rife-resources-models-flat-exe', resourcePath: 'resources/models/rife-ncnn-vulkan.exe' },
  ],
}

function parseFrameRate(rateText: string | undefined): number {
  if (!rateText || rateText === '0/0') {
    return 0
  }

  if (!rateText.includes('/')) {
    const value = Number(rateText)
    return Number.isFinite(value) ? value : 0
  }

  const [numeratorText, denominatorText] = rateText.split('/')
  const numerator = Number(numeratorText)
  const denominator = Number(denominatorText)

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0
  }

  return numerator / denominator
}

function parseFrameFromLine(line: string): number | null {
  const match = line.match(FRAME_REGEX)
  if (!match) {
    return null
  }

  const frame = Number(match[1])
  return Number.isFinite(frame) ? frame : null
}

function isWindowsRuntime(): boolean {
  return navigator.userAgent.includes('Windows')
}

function buildExecutableNames(binName: string): string[] {
  if (binName.endsWith('.exe') || !isWindowsRuntime()) {
    return [binName]
  }

  return [binName, `${binName}.exe`]
}

function buildResourceCandidates(binName: string): string[] {
  if (binName === 'ffmpeg' || binName === 'ffprobe' || binName === 'waifu2x-ncnn-vulkan' || binName === 'rife-ncnn-vulkan') {
    return SHELL_COMMAND_CANDIDATES[binName].map((candidate) => candidate.resourcePath)
  }

  const executables = buildExecutableNames(binName)

  if (binName === 'ffplay') {
    return executables.flatMap((name) => [
      `models/ffmpeg/${name}`,
      `resources/models/ffmpeg/${name}`,
      `models/${name}`,
      `resources/models/${name}`,
      `bin/${name}`,
      `resources/bin/${name}`,
    ])
  }

  return executables.flatMap((name) => [`models/${name}`, `resources/models/${name}`, `bin/${name}`, `resources/bin/${name}`])
}

async function resolveBinaryCandidate(binName: string): Promise<string> {
  const candidates = buildResourceCandidates(binName)

  for (const candidate of candidates) {
    const resourcePath = await resolveResource(candidate)
    if (await exists(resourcePath)) {
      return resourcePath
    }
  }

  return resolveResource(candidates[0])
}

export async function getResourcePath(binName: string): Promise<string> {
  return resolveBinaryCandidate(binName)
}

function formatNotFoundMessage(binName: string, checked: string[]): string {
  return `${binName} executable not found. Checked: ${checked.join(', ')}`
}

export async function getShellCommandName(binName: ShellBinaryName): Promise<string> {
  const checked: string[] = []

  for (const candidate of SHELL_COMMAND_CANDIDATES[binName]) {
    const resolvedPath = await resolveResource(candidate.resourcePath)
    checked.push(resolvedPath)
    if (await exists(resolvedPath)) {
      return candidate.commandName
    }
  }

  throw new Error(formatNotFoundMessage(binName, checked))
}

async function ensureDirectory(path: string): Promise<void> {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true })
  }
}

export async function cancelActiveFfmpegProcess(): Promise<void> {
  if (activeFfmpegChild) {
    await activeFfmpegChild.kill()
    activeFfmpegChild = null
  }
}

function splitOutputToLines(output: string): string[] {
  return output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)
}

function resolveVideoEncoder(settings: EncodeSettings): string {
  return settings.useHardwareEncoding ? settings.hardwareEncoder : settings.softwareEncoder
}

async function countFramesFromDirectory(framesDir: string): Promise<number> {
  const entries = await readDir(framesDir)
  return entries.filter((entry) => entry.isFile && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)).length
}

export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  const ffprobeCommand = await getShellCommandName('ffprobe')
  const output = await Command.create(ffprobeCommand, [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    videoPath,
  ]).execute()

  if (output.code !== 0) {
    throw new Error(output.stderr || 'ffprobe failed to read video information')
  }

  const parsed = JSON.parse(output.stdout) as FfprobeOutput
  const streams = parsed.streams ?? []
  const format = parsed.format ?? {}

  const videoStream = streams.find((stream) => stream.codec_type === 'video')
  if (!videoStream) {
    throw new Error('No video stream found')
  }

  const audioStream = streams.find((stream) => stream.codec_type === 'audio')
  const fps = parseFrameRate(videoStream.avg_frame_rate ?? videoStream.r_frame_rate)
  const duration = Number(format.duration ?? 0)
  const frameCountFromStream = Number(videoStream.nb_frames ?? 0)
  const calculatedFrames = fps > 0 && duration > 0 ? Math.max(1, Math.round(fps * duration)) : 0
  const totalFrames = Number.isFinite(frameCountFromStream) && frameCountFromStream > 0 ? frameCountFromStream : calculatedFrames

  const filename = await basename(videoPath)
  return {
    path: videoPath,
    filename,
    width: videoStream.width ?? 0,
    height: videoStream.height ?? 0,
    fps,
    duration,
    totalFrames,
    codec: videoStream.codec_name ?? 'unknown',
    bitrate: Number(format.bit_rate ?? 0),
    audioCodec: audioStream?.codec_name ?? null,
    fileSize: Number(format.size ?? 0),
  }
}

export async function getFrameCount(videoPath: string): Promise<number> {
  const info = await getVideoInfo(videoPath)
  return info.totalFrames
}

export async function extractFrames(videoPath: string, outputDir: string, onProgress?: ProgressCallback): Promise<void> {
  await ensureDirectory(outputDir)

  const totalFrames = await getFrameCount(videoPath)
  const outputPattern = `${outputDir}${sep()}frame_%08d.png`

  const ffmpegCommand = await getShellCommandName('ffmpeg')
  const command = Command.create(ffmpegCommand, ['-y', '-i', videoPath, '-vsync', '0', outputPattern])
  command.stderr.on('data', (line) => {
    const frame = parseFrameFromLine(line)
    if (frame !== null && onProgress) {
      onProgress(Math.min(frame, totalFrames || frame), totalFrames || frame)
    }
  })

  activeFfmpegChild = await command.spawn()

  const result = await new Promise<{ code: number | null; signal: number | null; stderr: string }>((resolveResult, rejectResult) => {
    let stderrText = ''

    command.stderr.on('data', (line) => {
      stderrText += `${line}\n`
    })

    command.on('error', (error) => {
      rejectResult(new Error(error))
    })

    command.on('close', (payload) => {
      resolveResult({ code: payload.code, signal: payload.signal, stderr: stderrText })
    })
  })

  activeFfmpegChild = null

  if (result.code !== 0) {
    throw new Error(result.stderr || `ffmpeg extract failed with code ${String(result.code)}`)
  }
}

export async function encodeVideo(
  framesDir: string,
  outputPath: string,
  fps: number,
  audioSourcePath: string | null,
  encodeSettings: EncodeSettings,
  onProgress?: ProgressCallback,
): Promise<void> {
  const slashIndex = outputPath.lastIndexOf('/')
  const backslashIndex = outputPath.lastIndexOf('\\')
  const lastSeparatorIndex = Math.max(slashIndex, backslashIndex)
  const outputDir = lastSeparatorIndex >= 0 ? outputPath.slice(0, lastSeparatorIndex) : ''
  if (outputDir) {
    await ensureDirectory(outputDir).catch(() => undefined)
  }

  const totalFrames = await countFramesFromDirectory(framesDir)
  const inputPattern = `${framesDir}${sep()}frame_%08d.png`

  const args = ['-y', '-framerate', `${fps}`, '-i', inputPattern]

  if (audioSourcePath) {
    args.push('-i', audioSourcePath, '-map', '0:v:0', '-map', '1:a:0?', '-c:a', 'copy')
  }

  const videoEncoder = resolveVideoEncoder(encodeSettings)
  args.push('-c:v', videoEncoder, '-pix_fmt', 'yuv420p')

  if (encodeSettings.useHardwareEncoding) {
    args.push('-preset', 'p5', '-rc', 'vbr', '-cq', '21')
  } else if (videoEncoder === 'libx264') {
    args.push('-preset', 'medium', '-crf', '18')
  } else if (videoEncoder === 'libx265') {
    args.push('-preset', 'medium', '-crf', '23')
  }

  args.push(outputPath)

  const ffmpegCommand = await getShellCommandName('ffmpeg')
  const command = Command.create(ffmpegCommand, args)
  command.stderr.on('data', (line) => {
    const frame = parseFrameFromLine(line)
    if (frame !== null && onProgress) {
      onProgress(Math.min(frame, totalFrames || frame), totalFrames || frame)
    }
  })

  activeFfmpegChild = await command.spawn()

  const result = await new Promise<{ code: number | null; signal: number | null; stderr: string }>((resolveResult, rejectResult) => {
    const stderrLines: string[] = []
    command.stderr.on('data', (line) => {
      stderrLines.push(line)
    })

    command.on('error', (error) => {
      rejectResult(new Error(error))
    })

    command.on('close', (payload) => {
      resolveResult({ code: payload.code, signal: payload.signal, stderr: stderrLines.join('\n') })
    })
  })

  activeFfmpegChild = null

  if (result.code !== 0) {
    throw new Error(result.stderr || `ffmpeg encode failed with code ${String(result.code)}`)
  }

  if (onProgress && totalFrames > 0) {
    onProgress(totalFrames, totalFrames)
  }
}

export function parseFfmpegProgressLines(output: string): number[] {
  const frames: number[] = []

  for (const line of splitOutputToLines(output)) {
    const frame = parseFrameFromLine(line)
    if (frame !== null) {
      frames.push(frame)
    }
  }

  return frames
}
