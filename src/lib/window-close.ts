import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { cancelAllProcessingTasks } from '@/lib/processing-runner'

const isTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const tryForceExit = async (): Promise<void> => {
  if (!isTauriRuntime()) {
    return
  }

  try {
    await invoke('force_exit')
  } catch (error) {
    console.error('[window-close] force_exit failed:', error)
  }
}

export const closeAppWindow = async (): Promise<void> => {
  cancelAllProcessingTasks()

  if (!isTauriRuntime()) {
    return
  }

  try {
    await getCurrentWindow().close()
  } catch (error) {
    console.error('[window-close] close failed, fallback to force_exit:', error)
    await tryForceExit()
    return
  }

  window.setTimeout(() => {
    void tryForceExit()
  }, 350)
}
