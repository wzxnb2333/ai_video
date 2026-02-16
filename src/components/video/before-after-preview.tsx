import { VideoPlayer } from '@/components/video/video-player'
import { t } from '@/lib/i18n'
import { useSettingsStore } from '@/stores/settings.store'

interface BeforeAfterPreviewProps {
  originalSrc: string | null
  processedSrc: string | null
}

export function BeforeAfterPreview({
  originalSrc,
  processedSrc,
}: BeforeAfterPreviewProps): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const tt = (zh: string, en: string): string => t(language, zh, en)

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs tracking-[0.22em] text-zinc-950 dark:text-zinc-400">{tt('原始视频', 'Original')}</p>
        <VideoPlayer src={originalSrc} index={1} title={tt('原始视频', 'Original Video')} />
      </div>
      <div className="space-y-2">
        <p className="text-xs tracking-[0.22em] text-zinc-950 dark:text-zinc-400">{tt('处理后视频', 'Processed')}</p>
        <VideoPlayer src={processedSrc} index={2} title={tt('处理后视频', 'Processed Video')} />
      </div>
    </section>
  )
}
