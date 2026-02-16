import { Film } from 'lucide-react'

import { t } from '@/lib/i18n'
import { useSettingsStore } from '@/stores/settings.store'

interface VideoPlayerProps {
  src: string | null
  index?: number
  title?: string
}

const getFilename = (path: string): string => {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? path
}

export function VideoPlayer({ src, index = 1, title }: VideoPlayerProps): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const tt = (zh: string, en: string): string => t(language, zh, en)
  const sequence = String(index).padStart(2, '0')
  const resolvedTitle = title ?? tt('视频信息', 'Video Info')

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80">
      {src ? (
        <div className="aspect-video w-full p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{resolvedTitle}</p>
            <span className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200">
              {tt('已加载', 'Loaded')}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/70">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{tt('序号', 'Index')}</p>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">#{sequence}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/70">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{tt('文件名', 'Filename')}</p>
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{getFilename(src)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/70">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{tt('路径', 'Path')}</p>
              <p className="truncate text-zinc-700 dark:text-zinc-300">{src}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-100 to-white text-zinc-700 dark:from-zinc-900 dark:to-zinc-950 dark:text-zinc-300">
          <Film className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
          <p className="text-sm">{tt('尚未加载视频', 'No video loaded')}</p>
        </div>
      )}
    </div>
  )
}
