import { FileVideo, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings.store'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open } from '@tauri-apps/plugin-dialog'

interface FileDropzoneProps {
  onFileSelect: (path: string) => void
}

const extensions = ['mp4', 'avi', 'mkv', 'mov', 'webm']

const isSupportedVideo = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? extensions.includes(ext) : false
}

const getFileName = (path: string): string => {
  const pieces = path.replace(/\\/g, '/').split('/')
  return pieces[pieces.length - 1] ?? path
}

const isTauriRuntime = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const decodeFileUriToPath = (uri: string): string | null => {
  try {
    const parsed = new URL(uri)
    if (parsed.protocol !== 'file:') {
      return null
    }

    const pathname = decodeURIComponent(parsed.pathname)

    if (parsed.host) {
      return `\\\\${parsed.host}${pathname.replace(/\//g, '\\\\')}`
    }

    if (/^\/[A-Za-z]:\//.test(pathname)) {
      return pathname.slice(1).replace(/\//g, '\\\\')
    }

    return pathname
  } catch {
    return null
  }
}

const extractPathFromDropEvent = (event: React.DragEvent<HTMLDivElement>): string | null => {
  const file = event.dataTransfer.files.item(0)
  const pathFromFile = (file as File & { path?: string }).path
  if (pathFromFile) {
    return pathFromFile
  }

  const uriList = event.dataTransfer.getData('text/uri-list')
  if (uriList) {
    const firstUri = uriList
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('#'))
    if (firstUri) {
      const decoded = decodeFileUriToPath(firstUri)
      if (decoded) {
        return decoded
      }
    }
  }

  const plainText = event.dataTransfer.getData('text/plain').trim()
  if (plainText) {
    const decoded = decodeFileUriToPath(plainText)
    if (decoded) {
      return decoded
    }

    if (/^[a-zA-Z]:\\/.test(plainText) || plainText.startsWith('\\\\')) {
      return plainText
    }
  }

  return null
}

export function FileDropzone({ onFileSelect }: FileDropzoneProps): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const tt = (zh: string, en: string): string => t(language, zh, en)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applySelectedPath = (path: string): void => {
    const fileName = getFileName(path)
    if (!isSupportedVideo(fileName)) {
      setError(tt('仅支持 MP4、AVI、MKV、MOV、WEBM 格式。', 'Only MP4, AVI, MKV, MOV, and WEBM are supported.'))
      return
    }

    setError(null)
    setSelectedPath(path)
    onFileSelect(path)
  }

  const pickFile = async (): Promise<void> => {
    const picked = await open({
      multiple: false,
      filters: [
        {
          name: tt('视频', 'Video'),
          extensions,
        },
      ],
    })

    if (!picked || Array.isArray(picked)) {
      return
    }

    applySelectedPath(picked)
  }

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setIsDragging(false)

    const path = extractPathFromDropEvent(event)
    if (!path) {
      setError(tt('未获取到可用文件路径，请使用“浏览文件”选择。', 'No valid file path detected. Use "Browse Files" instead.'))
      return
    }

    applySelectedPath(path)
  }

  useEffect(() => {
    if (!isTauriRuntime()) {
      return
    }

    let unlisten: (() => void) | null = null

    void getCurrentWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          setIsDragging(true)
          return
        }

        if (event.payload.type === 'leave') {
          setIsDragging(false)
          return
        }

        if (event.payload.type === 'drop') {
          setIsDragging(false)
          const droppedPath = event.payload.paths[0]
          if (droppedPath) {
            applySelectedPath(droppedPath)
          } else {
            setError(tt('拖拽未提供可用路径，请使用“浏览文件”选择。', 'Drop event returned no path. Use "Browse Files" instead.'))
          }
        }
      })
      .then((fn) => {
        unlisten = fn
      })
      .catch((listenError) => {
        console.error('[file-dropzone] failed to bind drag-drop event:', listenError)
      })

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, onFileSelect])

  return (
    <section
      className={cn(
        'rounded-3xl border border-dashed p-8 transition-all',
        isDragging
          ? 'border-cyan-300 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.24)]'
          : 'border-zinc-300 bg-zinc-50 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50',
      )}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => {
        setIsDragging(false)
      }}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl bg-cyan-500/15 p-4 text-cyan-300">
          <UploadCloud className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{tt('将源视频拖放到这里', 'Drop source video here')}</h3>
          <p className="text-sm text-zinc-950 dark:text-zinc-400">
            {tt('你可以直接拖拽视频文件，或点击按钮选择文件。', 'Drag a video file directly, or click the button to choose one.')}
          </p>
        </div>
        <Button onClick={pickFile} className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
          {tt('浏览文件', 'Browse Files')}
        </Button>

        {selectedPath ? (
          <div className="mt-2 flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-200">
            <FileVideo className="h-3.5 w-3.5" />
            <span>{getFileName(selectedPath)}</span>
          </div>
        ) : null}

        {error ? <p className="text-xs text-red-300">{error}</p> : null}
      </div>
    </section>
  )
}
