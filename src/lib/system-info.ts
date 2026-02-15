import { invoke } from '@tauri-apps/api/core'

export interface SystemGpuInfo {
  name: string
  vramMb: number | null
}

export async function listSystemGpus(): Promise<SystemGpuInfo[]> {
  return invoke<SystemGpuInfo[]>('list_system_gpus')
}
