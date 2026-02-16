import { useEffect, useState } from 'react'

import { getVideoInfo } from '@/lib/ffmpeg'
import type { VideoInfo } from '@/types/pipeline'

const getFilename = (filePath: string): string => {
  const sections = filePath.replace(/\\/g, '/').split('/')
  return sections[sections.length - 1] ?? filePath
}

const buildFallbackInfo = (filePath: string): VideoInfo => {
  return {
    path: filePath,
    filename: getFilename(filePath),
    width: 0,
    height: 0,
    fps: 0,
    duration: 0,
    totalFrames: 0,
    codec: 'unknown',
    bitrate: 0,
    audioCodec: null,
    fileSize: 0,
  }
}

const isTauriRuntime = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function useVideoInfo(filePath: string | null): {
  info: VideoInfo | null
  loading: boolean
  error: string | null
} {
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!filePath) {
      setInfo(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const loadVideoInfo = async (): Promise<void> => {
      try {
        if (!isTauriRuntime()) {
          throw new Error('Video metadata can only be read in desktop runtime')
        }

        const result = await getVideoInfo(filePath)
        if (cancelled) {
          return
        }
        setInfo(result)
        setLoading(false)
      } catch (error) {
        if (cancelled) {
          return
        }
        setInfo(buildFallbackInfo(filePath))
        setLoading(false)
        setError(error instanceof Error ? error.message : String(error))
      }
    }

    void loadVideoInfo()

    return () => {
      cancelled = true
    }
  }, [filePath])

  return {
    info,
    loading,
    error,
  }
}
