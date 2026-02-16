import { Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { useSettingsStore } from '@/stores/settings.store'

const titleMap: Record<string, { zh: string; en: string }> = {
  '/': { zh: '总览面板', en: 'Overview' },
  '/upscale': { zh: '超分辨率', en: 'Upscale' },
  '/interpolate': { zh: '补帧', en: 'Interpolate' },
  '/workflow': { zh: '工作流', en: 'Workflow' },
  '/queue': { zh: '任务队列', en: 'Queue' },
  '/settings': { zh: '设置', en: 'Settings' },
}

const syncThemeClass = (theme: 'dark' | 'light' | 'system'): void => {
  const root = document.documentElement
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)
  root.classList.toggle('dark', isDark)
}

export function Header(): React.JSX.Element {
  const location = useLocation()
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const language = useSettingsStore((state) => state.language)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    syncThemeClass(theme)

    if (theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (): void => {
      syncThemeClass('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const pageTitleEntry = titleMap[location.pathname]
  const pageTitle = pageTitleEntry
    ? t(language, pageTitleEntry.zh, pageTitleEntry.en)
    : t(language, '视频增强工坊', 'Video Enhance Lab')

  const toggleTheme = (): void => {
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(systemDark ? 'light' : 'dark')
      return
    }

    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/92 px-6 py-4 dark:border-white/10 dark:bg-zinc-950/90">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.24em] text-cyan-700/80 dark:text-cyan-200/70">
            {t(language, 'AI 视频处理工作区', 'AI Video Workspace')}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{pageTitle}</h2>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          onClick={toggleTheme}
          aria-label={t(language, '切换明暗主题', 'Toggle light/dark theme')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
