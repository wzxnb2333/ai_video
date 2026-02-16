import { Layers2, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { InterpolateParamsPanel } from '@/components/settings/interpolate-params-panel'
import { UpscaleParamsPanel } from '@/components/settings/upscale-params-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileDropzone } from '@/components/video/file-dropzone'
import { VideoPlayer } from '@/components/video/video-player'
import { useProcessing } from '@/hooks/useProcessing'
import { useVideoInfo } from '@/hooks/useVideoInfo'
import { t } from '@/lib/i18n'
import { describeWorkflowAutoChoice } from '@/lib/workflow'
import { useSettingsStore } from '@/stores/settings.store'

const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) {
    return '0 MB'
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const toSourceFrames = (fps: number, duration: number, totalFrames: number): number => {
  if (totalFrames > 0) {
    return totalFrames
  }
  if (fps > 0 && duration > 0) {
    return Math.max(1, Math.round(fps * duration))
  }
  return 300
}

export function WorkflowPage(): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const tt = (zh: string, en: string): string => t(language, zh, en)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [targetWidthInput, setTargetWidthInput] = useState(String(useSettingsStore.getState().workflowSettings.targetWidth))
  const [targetHeightInput, setTargetHeightInput] = useState(String(useSettingsStore.getState().workflowSettings.targetHeight))
  const [targetFpsInput, setTargetFpsInput] = useState(String(useSettingsStore.getState().workflowSettings.targetFps))
  const { addWorkflowTask, tasks } = useProcessing()
  const { info, loading, error } = useVideoInfo(selectedPath)

  const workflowSettings = useSettingsStore((state) => state.workflowSettings)
  const setWorkflowSettings = useSettingsStore((state) => state.setWorkflowSettings)
  const upscaleParams = useSettingsStore((state) => state.upscaleParams)
  const interpolateParams = useSettingsStore((state) => state.interpolateParams)

  const currentTaskForSelection = selectedPath
    ? tasks.find(
      (task) =>
        task.type === 'workflow'
        && task.inputPath === selectedPath
        && (task.status === 'pending' || task.status === 'processing'),
    )
    : null

  const isQueued = Boolean(currentTaskForSelection)
  const isProcessing = currentTaskForSelection?.status === 'processing'
  const progressText = isProcessing
    ? `${tt('处理中', 'Processing')} ${Math.max(0, Math.min(100, Math.round(currentTaskForSelection.progress)))}%`
    : tt('已在队列中', 'Queued')

  const autoDecision = useMemo(() => {
    if (!info) {
      return null
    }
    try {
      return describeWorkflowAutoChoice(
        {
          width: info.width,
          height: info.height,
          fps: info.fps,
          totalFrames: toSourceFrames(info.fps, info.duration, info.totalFrames),
        },
        {
          orderStrategy: workflowSettings.orderStrategy,
          resolvedOrder: null,
          outputMode: workflowSettings.outputMode,
          targetWidth: workflowSettings.targetWidth,
          targetHeight: workflowSettings.targetHeight,
          targetFps: workflowSettings.targetFps,
          upscale: upscaleParams,
          interpolate: interpolateParams,
        },
        language,
      )
    } catch (caughtError) {
      return {
        order: 'upscale-first' as const,
        message: caughtError instanceof Error ? caughtError.message : String(caughtError),
        invalid: true,
      }
    }
  }, [language, workflowSettings, info, upscaleParams, interpolateParams])
  const hasPlanError = Boolean(autoDecision && 'invalid' in autoDecision && autoDecision.invalid)

  const commitTargetWidth = (): void => {
    const parsed = Number(targetWidthInput.trim())
    if (Number.isFinite(parsed) && parsed > 0) {
      setWorkflowSettings({ targetWidth: Math.trunc(parsed) })
      return
    }
    setTargetWidthInput(String(workflowSettings.targetWidth))
  }

  const commitTargetHeight = (): void => {
    const parsed = Number(targetHeightInput.trim())
    if (Number.isFinite(parsed) && parsed > 0) {
      setWorkflowSettings({ targetHeight: Math.trunc(parsed) })
      return
    }
    setTargetHeightInput(String(workflowSettings.targetHeight))
  }

  const commitTargetFps = (): void => {
    const parsed = Number(targetFpsInput.trim())
    if (Number.isFinite(parsed) && parsed > 0) {
      setWorkflowSettings({ targetFps: parsed })
      return
    }
    setTargetFpsInput(String(workflowSettings.targetFps))
  }

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
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/75 shadow-[0_18px_45px_-30px_rgba(14,165,233,0.45)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <Layers2 className="h-5 w-5 text-sky-300" />
                {tt('工作流策略', 'Workflow Strategy')}
              </CardTitle>
              <CardDescription className="text-zinc-950 dark:text-zinc-400">
                {tt('将补帧与超分串联执行，自动或手动指定先后顺序。', 'Chain interpolation and upscale with auto or manual step order.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{tt('执行顺序', 'Execution order')}</Label>
                <Select
                  value={workflowSettings.orderStrategy}
                  onValueChange={(value) => {
                    if (value === 'auto' || value === 'upscale-first' || value === 'interpolate-first') {
                      setWorkflowSettings({ orderStrategy: value })
                    }
                  }}
                >
                  <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{tt('自动（优先速度）', 'Auto (speed first)')}</SelectItem>
                    <SelectItem value="upscale-first">{tt('先超分后补帧', 'Upscale then interpolate')}</SelectItem>
                    <SelectItem value="interpolate-first">{tt('先补帧后超分', 'Interpolate then upscale')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{tt('输出控制模式', 'Output mode')}</Label>
                <Select
                  value={workflowSettings.outputMode}
                  onValueChange={(value) => {
                    if (value === 'ratio' || value === 'target') {
                      setWorkflowSettings({ outputMode: value })
                    }
                  }}
                >
                  <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ratio">{tt('使用倍率（当前面板设置）', 'Use ratio (panel settings)')}</SelectItem>
                    <SelectItem value="target">{tt('使用目标分辨率 + 目标帧率', 'Use target resolution + target FPS')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {workflowSettings.outputMode === 'target' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="workflow-target-width">{tt('目标宽度', 'Target width')}</Label>
                    <Input
                      id="workflow-target-width"
                      type="text"
                      inputMode="numeric"
                      value={targetWidthInput}
                      className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      onChange={(event) => {
                        setTargetWidthInput(event.target.value)
                      }}
                      onBlur={commitTargetWidth}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workflow-target-height">{tt('目标高度', 'Target height')}</Label>
                    <Input
                      id="workflow-target-height"
                      type="text"
                      inputMode="numeric"
                      value={targetHeightInput}
                      className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      onChange={(event) => {
                        setTargetHeightInput(event.target.value)
                      }}
                      onBlur={commitTargetHeight}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workflow-target-fps">{tt('目标帧率', 'Target FPS')}</Label>
                    <Input
                      id="workflow-target-fps"
                      type="text"
                      inputMode="decimal"
                      value={targetFpsInput}
                      className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      onChange={(event) => {
                        setTargetFpsInput(event.target.value)
                      }}
                      onBlur={commitTargetFps}
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-3 text-xs text-zinc-700 dark:text-zinc-300">
                {workflowSettings.orderStrategy === 'auto'
                  ? (autoDecision?.message ?? tt('自动模式将按当前参数和素材规模估算更快顺序。', 'Auto mode estimates a faster order from current parameters and source.'))
                  : workflowSettings.orderStrategy === 'upscale-first'
                    ? tt('已固定：先超分后补帧。一般在高倍率补帧时速度更稳定。', 'Locked: upscale first, then interpolate. Usually more stable when frame multiplier is high.')
                    : tt('已固定：先补帧后超分。一般在超分较轻、补帧较重时更合适。', 'Locked: interpolate first, then upscale. Better when interpolation is heavier than upscale.')}
              </div>
              {hasPlanError ? (
                <p className="text-xs text-red-600 dark:text-red-300">
                  {tt('当前目标参数不可执行，请先调整目标分辨率或目标帧率。', 'Current target parameters are not feasible. Adjust target resolution or FPS first.')}
                </p>
              ) : null}
              {workflowSettings.outputMode === 'target' ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {tt(
                    '目标分辨率会先选择整数倍超分（2x/4x）覆盖目标，再在编码阶段精确缩放到目标尺寸。',
                    'Target resolution first uses an integer upscale (2x/4x) to cover the target, then scales precisely during encoding.',
                  )}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <InterpolateParamsPanel />
          <UpscaleParamsPanel />

          <Button
            className="h-12 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400"
            disabled={!selectedPath || isQueued || hasPlanError}
            onClick={() => {
              if (!selectedPath || isQueued) {
                return
              }
              addWorkflowTask(selectedPath)
            }}
          >
            {isQueued ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Layers2 className="mr-2 h-4 w-4" />
            )}
            {isQueued ? progressText : tt('开始工作流处理（补帧 + 超分）', 'Start Workflow (Interpolate + Upscale)')}
          </Button>
        </div>
      </div>
    </section>
  )
}
