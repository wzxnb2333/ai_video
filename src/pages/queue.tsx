import { AlertCircle, CheckCircle2, Clock3, Trash2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProcessing } from '@/hooks/useProcessing'
import { t } from '@/lib/i18n'
import { useProcessingStore } from '@/stores/processing.store'
import { useSettingsStore } from '@/stores/settings.store'
import type { ProcessingStatus, ProcessingTask, WorkflowTaskParams } from '@/types/pipeline'

const formatGpuSetting = (gpuId: number, language: 'zh-CN' | 'en-US'): string => {
  return gpuId < 0 ? t(language, '自动', 'Auto') : String(gpuId)
}

const isWorkflowTask = (
  task: ProcessingTask,
): task is ProcessingTask & { params: WorkflowTaskParams } => task.type === 'workflow'

const formatStageMessage = (message: string | null, language: 'zh-CN' | 'en-US'): string => {
  if (!message) {
    return ''
  }
  const map: Record<string, string> = {
    '准备处理': 'Preparing',
    '处理完成': 'Completed',
    '已取消': 'Cancelled',
    '处理失败': 'Failed',
    'Extracting source frames': 'Extracting source frames',
    'Upscaling frames with waifu2x': 'Upscaling frames with waifu2x',
    'Interpolating frames with RIFE': 'Interpolating frames with RIFE',
    'Encoding final video': 'Encoding final video',
    'Processing complete': 'Processing complete',
  }
  return language === 'en-US' ? (map[message] ?? message) : message
}

const formatTaskType = (task: ProcessingTask, language: 'zh-CN' | 'en-US'): string => {
  if (task.type === 'upscale') {
    return t(language, '超分辨率', 'Upscale')
  }
  if (task.type === 'interpolate') {
    return t(language, '补帧', 'Interpolate')
  }
  return t(language, '工作流', 'Workflow')
}

const formatTaskGpuSetting = (task: ProcessingTask, language: 'zh-CN' | 'en-US'): string => {
  if (!isWorkflowTask(task)) {
    return `${t(language, 'GPU 设置', 'GPU')}: ${formatGpuSetting(task.params.gpuId, language)}`
  }

  return `${t(language, 'GPU 设置', 'GPU')}: ${t(language, '补帧', 'Interpolate')} ${formatGpuSetting(task.params.interpolate.gpuId, language)} / ${t(language, '超分', 'Upscale')} ${formatGpuSetting(task.params.upscale.gpuId, language)}`
}

const formatEncoderSetting = (task: { encodeSettings: { useHardwareEncoding: boolean; softwareEncoder: string; hardwareEncoder: string } }): string => {
  return task.encodeSettings.useHardwareEncoding
    ? task.encodeSettings.hardwareEncoder
    : task.encodeSettings.softwareEncoder
}

const getStatusConfig = (language: 'zh-CN' | 'en-US'): Record<
  ProcessingStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> => ({
  pending: {
    label: t(language, '等待中', 'Pending'),
    className: 'border-zinc-500/50 bg-zinc-200/40 text-zinc-700 dark:border-zinc-600/60 dark:bg-zinc-800/50 dark:text-zinc-200',
    icon: Clock3,
  },
  processing: {
    label: t(language, '处理中', 'Processing'),
    className: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    icon: Clock3,
  },
  completed: {
    label: t(language, '已完成', 'Completed'),
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    icon: CheckCircle2,
  },
  error: {
    label: t(language, '失败', 'Failed'),
    className: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-200',
    icon: AlertCircle,
  },
  cancelled: {
    label: t(language, '已取消', 'Cancelled'),
    className: 'border-zinc-500/50 bg-zinc-200/40 text-zinc-700 dark:border-zinc-600/60 dark:bg-zinc-800/50 dark:text-zinc-300',
    icon: XCircle,
  },
})

export function QueuePage(): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const statusConfig = getStatusConfig(language)
  const { tasks, cancelTask, clearCompleted } = useProcessing()
  const removeTask = useProcessingStore((state) => state.removeTask)

  return (
    <section className="space-y-6">
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-zinc-900 dark:text-zinc-100">{t(language, '任务处理队列', 'Task Queue')}</CardTitle>
          <Button
            variant="outline"
            className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            onClick={clearCompleted}
          >
            {t(language, '清除已完成', 'Clear Completed')}
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] pr-4">
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-8 text-center text-zinc-950 dark:text-zinc-400">
                  {t(language, '当前队列为空。', 'Queue is empty.')}
                </div>
              ) : (
                tasks.map((task) => {
                  const status = statusConfig[task.status]
                  const StatusIcon = status.icon

                  return (
                    <article key={task.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/65 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatTaskType(task, language)}{t(language, '任务', ' Task')}</p>
                          <p className="text-xs text-zinc-950 dark:text-zinc-500">{task.inputPath}</p>
                        </div>
                        <Badge className={status.className}>
                          <StatusIcon className="mr-1 h-3.5 w-3.5" />
                          {status.label}
                        </Badge>
                      </div>

                      <Progress value={task.progress} className="h-2 bg-zinc-200 dark:bg-zinc-800" />

                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-950 dark:text-zinc-400">
                        <span>{t(language, '完成度', 'Progress')}: {Math.round(task.progress)}%</span>
                        <span>
                          {t(language, '帧', 'Frames')}: {task.currentFrame} / {task.totalFrames || t(language, '未知', 'Unknown')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-950 dark:text-zinc-400">
                        {t(language, '当前步骤', 'Current stage')}: {formatStageMessage(task.stageMessage, language) || (task.status === 'pending' ? t(language, '等待调度', 'Waiting for scheduler') : t(language, '暂无', 'N/A'))}
                      </p>
                      <p className="mt-2 text-xs text-zinc-950 dark:text-zinc-400">{formatTaskGpuSetting(task, language)}</p>
                      {isWorkflowTask(task) ? (
                        <>
                          <p className="mt-1 text-xs text-zinc-950 dark:text-zinc-400">
                            {t(language, '顺序策略', 'Order strategy')}:{' '}
                            {task.params.orderStrategy === 'auto'
                              ? t(language, '自动优先速度', 'Auto speed-first')
                              : task.params.orderStrategy === 'upscale-first'
                                ? t(language, '先超分后补帧', 'Upscale then interpolate')
                                : t(language, '先补帧后超分', 'Interpolate then upscale')}
                          </p>
                          <p className="mt-1 text-xs text-zinc-950 dark:text-zinc-400">
                            {t(language, '输出模式', 'Output mode')}:{' '}
                            {task.params.outputMode === 'target'
                              ? `${t(language, '目标', 'Target')} ${task.params.targetWidth}x${task.params.targetHeight} @ ${task.params.targetFps}fps`
                              : t(language, '倍率模式', 'Ratio mode')}
                          </p>
                        </>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-950 dark:text-zinc-400">
                        {t(language, '编码器', 'Encoder')}: {formatEncoderSetting(task)}
                      </p>

                      {task.status === 'error' && task.error ? (
                        <div className="mt-3 rounded-lg border border-red-300/70 dark:border-red-500/40 bg-red-50/80 dark:bg-red-900/20 p-2">
                          <p className="text-xs font-medium text-red-700 dark:text-red-300">{t(language, '错误详情', 'Error details')}</p>
                          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-xs text-red-700 dark:text-red-300">
                            {task.error}
                          </pre>
                        </div>
                      ) : null}

                      <div className="mt-4 flex gap-2">
                        {task.status === 'processing' || task.status === 'pending' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            onClick={() => cancelTask(task.id)}
                          >
                            {t(language, '取消', 'Cancel')}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          onClick={() => removeTask(task.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {t(language, '移除', 'Remove')}
                        </Button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  )
}
