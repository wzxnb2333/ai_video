import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { UnlistenFn } from '@tauri-apps/api/event'

import { TooltipProvider } from '@/components/ui/tooltip'
import { cancelAllProcessingTasks } from '@/lib/processing-runner'
import { useProcessingStore } from '@/stores/processing.store'
import { App } from './App'
import './index.css'

const applyInitialTheme = (): void => {
  let theme: 'dark' | 'light' | 'system' = 'dark'

  try {
    const raw = localStorage.getItem('ai-video-settings')
    if (raw) {
      const parsed = JSON.parse(raw) as {
        state?: {
          theme?: 'dark' | 'light' | 'system'
        }
      }

      const persistedTheme = parsed.state?.theme
      if (persistedTheme === 'dark' || persistedTheme === 'light' || persistedTheme === 'system') {
        theme = persistedTheme
      }
    }
  } catch {
    theme = 'dark'
  }

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)
  document.documentElement.classList.toggle('dark', isDark)
}

const applyInitialLanguage = (): void => {
  let language: 'zh-CN' | 'en-US' = 'zh-CN'

  try {
    const raw = localStorage.getItem('ai-video-settings')
    if (raw) {
      const parsed = JSON.parse(raw) as {
        state?: {
          language?: 'zh-CN' | 'en-US'
        }
      }

      const persistedLanguage = parsed.state?.language
      if (persistedLanguage === 'zh-CN' || persistedLanguage === 'en-US') {
        language = persistedLanguage
      }
    }
  } catch {
    language = 'zh-CN'
  }

  document.documentElement.lang = language
}

applyInitialTheme()
applyInitialLanguage()

declare global {
  interface Window {
    __aiVideoCloseUnlisten?: UnlistenFn
  }
}

const registerCloseCancellation = (): void => {
  if (!(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window)) {
    return
  }

  const appWindow = getCurrentWindow()
  if (window.__aiVideoCloseUnlisten) {
    window.__aiVideoCloseUnlisten()
    window.__aiVideoCloseUnlisten = undefined
  }

  void appWindow.onCloseRequested(() => {
    try {
      const hasActiveProcessing = useProcessingStore
        .getState()
        .tasks
        .some((task) => task.status === 'processing' || task.status === 'pending')

      if (!hasActiveProcessing) {
        return
      }

      cancelAllProcessingTasks()
    } catch (error) {
      console.error('[main] close cancellation hook failed:', error)
    }
  }).then((unlisten) => {
    window.__aiVideoCloseUnlisten = unlisten
  })
}

registerCloseCancellation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>,
)
