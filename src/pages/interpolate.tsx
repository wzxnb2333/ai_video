import { GaugeCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { InterpolateParamsPanel } from '@/components/settings/interpolate-params-panel'
import { Button } from '@/components/ui/button'
import { BeforeAfterPreview } from '@/components/video/before-after-preview'
import { FileDropzone } from '@/components/video/file-dropzone'
import { useProcessing } from '@/hooks/useProcessing'
import { t } from '@/lib/i18n'
import { useSettingsStore } from '@/stores/settings.store'

export function InterpolatePage(): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const tt = (zh: string, en: string): string => t(language, zh, en)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const { addInterpolateTask, tasks } = useProcessing()

  const currentTaskForSelection = selectedPath
    ? tasks.find(
      (task) =>
        task.type === 'interpolate'
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
          <BeforeAfterPreview originalSrc={selectedPath} processedSrc={null} />
        </div>
        <div className="space-y-6">
          <InterpolateParamsPanel />
          <Button
            className="h-12 w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
            disabled={!selectedPath || isQueued}
            onClick={() => {
              if (!selectedPath || isQueued) {
                return
              }
              addInterpolateTask(selectedPath)
            }}
          >
            {isQueued ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GaugeCircle className="mr-2 h-4 w-4" />
            )}
            {isQueued ? progressText : tt('开始补帧处理', 'Start Interpolation')}
          </Button>
        </div>
      </div>
    </section>
  )
}
