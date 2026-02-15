import { AlertCircle, CheckCircle2, Clock3, Trash2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProcessing } from '@/hooks/useProcessing'
import { useProcessingStore } from '@/stores/processing.store'
import type { ProcessingStatus } from '@/types/pipeline'

const statusConfig: Record<
  ProcessingStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: '等待中',
    className: 'border-zinc-500/50 bg-zinc-200/40 text-zinc-700 dark:border-zinc-600/60 dark:bg-zinc-800/50 dark:text-zinc-200',
    icon: Clock3,
  },
  processing: {
    label: '处理中',
    className: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    icon: Clock3,
  },
  completed: {
    label: '已完成',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    icon: CheckCircle2,
  },
  error: {
    label: '失败',
    className: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-200',
    icon: AlertCircle,
  },
  cancelled: {
    label: '已取消',
    className: 'border-zinc-500/50 bg-zinc-200/40 text-zinc-700 dark:border-zinc-600/60 dark:bg-zinc-800/50 dark:text-zinc-300',
    icon: XCircle,
  },
}

const formatGpuSetting = (gpuId: number): string => {
  return gpuId < 0 ? '自动' : String(gpuId)
}

const formatEncoderSetting = (task: { encodeSettings: { useHardwareEncoding: boolean; softwareEncoder: string; hardwareEncoder: string } }): string => {
  return task.encodeSettings.useHardwareEncoding
    ? task.encodeSettings.hardwareEncoder
    : task.encodeSettings.softwareEncoder
}

export function QueuePage(): React.JSX.Element {
  const { tasks, cancelTask, clearCompleted } = useProcessing()
  const removeTask = useProcessingStore((state) => state.removeTask)

  return (
    <section className="space-y-6">
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-zinc-900 dark:text-zinc-100">任务处理队列</CardTitle>
          <Button
            variant="outline"
            className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            onClick={clearCompleted}
          >
            清除已完成
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] pr-4">
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-8 text-center text-zinc-950 dark:text-zinc-400">
                  当前队列为空。
                </div>
              ) : (
                tasks.map((task) => {
                  const status = statusConfig[task.status]
                  const StatusIcon = status.icon

                  return (
                    <article key={task.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/65 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{task.type === 'upscale' ? '超分辨率' : '补帧'}任务</p>
                          <p className="text-xs text-zinc-950 dark:text-zinc-500">{task.inputPath}</p>
                        </div>
                        <Badge className={status.className}>
                          <StatusIcon className="mr-1 h-3.5 w-3.5" />
                          {status.label}
                        </Badge>
                      </div>

                      <Progress value={task.progress} className="h-2 bg-zinc-200 dark:bg-zinc-800" />

                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-950 dark:text-zinc-400">
                        <span>完成度：{Math.round(task.progress)}%</span>
                        <span>
                          帧：{task.currentFrame} / {task.totalFrames || '未知'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-950 dark:text-zinc-400">
                        GPU 设置：{formatGpuSetting(task.params.gpuId)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-950 dark:text-zinc-400">
                        编码器：{formatEncoderSetting(task)}
                      </p>

                      {task.status === 'error' && task.error ? (
                        <div className="mt-3 rounded-lg border border-red-300/70 dark:border-red-500/40 bg-red-50/80 dark:bg-red-900/20 p-2">
                          <p className="text-xs font-medium text-red-700 dark:text-red-300">错误详情</p>
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
                            取消
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          onClick={() => removeTask(task.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          移除
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
