import { Loader2, Rocket } from 'lucide-react'
import { useState } from 'react'

import { UpscaleParamsPanel } from '@/components/settings/upscale-params-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDropzone } from '@/components/video/file-dropzone'
import { VideoPlayer } from '@/components/video/video-player'
import { useProcessing } from '@/hooks/useProcessing'
import { useVideoInfo } from '@/hooks/useVideoInfo'
import { t } from '@/lib/i18n'
import { useSettingsStore } from '@/stores/settings.store'

const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) {
    return '0 MB'
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function UpscalePage(): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const tt = (zh: string, en: string): string => t(language, zh, en)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const { addUpscaleTask, tasks } = useProcessing()
  const { info, loading, error } = useVideoInfo(selectedPath)

  const currentTaskForSelection = selectedPath
    ? tasks.find(
      (task) =>
        task.type === 'upscale'
        && task.inputPath === selectedPath
        && (task.status === 'pending' || task.status === 'processing'),
    )
    : null
  const isQueued = Boolean(currentTaskForSelection)
  const isProcessing = currentTaskForSelection?.status === 'processing'
  const progressText = isProcessing
    ? `${tt('处理中', 'Processing')} ${Math.max(0, Math.min(100, Math.round(currentTaskForSelection.progress)))}%`
    : tt('已在队列中', 'Queued')

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <FileDropzone onFileSelect={setSelectedPath} />
          <VideoPlayer src={selectedPath} index={1} title={tt('当前视频', 'Current Video')} />
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
            <CardHeader>
              <CardTitle className="text-zinc-900 dark:text-zinc-100">{tt('源视频信息', 'Source Video Info')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-950 dark:text-zinc-400">
              {loading ? (
                <p>{tt('正在读取元数据...', 'Reading metadata...')}</p>
              ) : error ? (
                <p className="text-red-500 dark:text-red-300">{tt('读取元数据失败：', 'Metadata read failed: ')}{error}</p>
              ) : info ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>{tt('文件名', 'Filename')}: {info.filename}</p>
                  <p>{tt('分辨率', 'Resolution')}: {info.width}x{info.height}</p>
                  <p>FPS: {info.fps}</p>
                  <p>{tt('编码格式', 'Codec')}: {info.codec}</p>
                  <p>{tt('音频', 'Audio')}: {info.audioCodec ?? tt('无', 'None')}</p>
                  <p>{tt('大小', 'Size')}: {formatFileSize(info.fileSize)}</p>
                </div>
              ) : (
                <p>{tt('请选择一个视频文件以查看详细信息。', 'Choose a video file to view details.')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <UpscaleParamsPanel />
          <Button
            className="h-12 w-full bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
            disabled={!selectedPath || isQueued}
            onClick={() => {
              if (!selectedPath || isQueued) {
                return
              }
              addUpscaleTask(selectedPath)
            }}
          >
            {isQueued ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            {isQueued ? progressText : tt('开始超分辨率处理', 'Start Upscale')}
          </Button>
        </div>
      </div>
    </section>
  )
}
