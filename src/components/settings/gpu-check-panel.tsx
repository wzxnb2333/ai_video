import { Cpu, ScanSearch } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { detectGpuDevices, getNcnnRecommendationByVram, getRifeRecommendationByVram } from '@/lib/gpu'
import type { GpuDeviceInfo } from '@/lib/gpu'

export function GpuCheckPanel(): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [devices, setDevices] = useState<GpuDeviceInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  const runCheck = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const detected = await detectGpuDevices(true)
      setDevices(detected)
      setChecked(true)
    } catch (checkError) {
      setDevices([])
      setChecked(true)
      setError(checkError instanceof Error ? checkError.message : String(checkError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">手动检查 GPU</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">用于确认 Vulkan 设备编号。检测命令不会修改文件。</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          onClick={() => {
            void runCheck()
          }}
          disabled={loading}
        >
          <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
          {loading ? '检测中...' : '检查 GPU'}
        </Button>
      </div>

      {checked && devices.length > 0 ? (
        <div className="space-y-1">
          {devices.map((device) => (
            <div key={`${device.id}-${device.name}`} className="text-xs text-zinc-700 dark:text-zinc-300">
              <p>GPU {device.id}: {device.name}</p>
              {(() => {
                const ncnnRecommendation = getNcnnRecommendationByVram(device.vramMb)
                const rifeRecommendation = getRifeRecommendationByVram(device.vramMb)
                return (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    显存: {device.vramMb ? `${device.vramMb} MB` : '未知'}
                    {' | '}
                    推荐 Tile: {ncnnRecommendation.tileSize}
                    {' | '}
                    超分线程: {ncnnRecommendation.threadSpec}
                    {' | '}
                    补帧线程: {rifeRecommendation.threadSpec}
                  </p>
                )
              })()}
            </div>
          ))}
        </div>
      ) : null}

      {checked && devices.length === 0 && !error ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">未检测到可用 GPU，可能已回退到 CPU。</p>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-300/60 dark:border-red-500/40 bg-red-50/80 dark:bg-red-900/20 p-2">
          <p className="flex items-center gap-1 text-xs text-red-700 dark:text-red-300">
            <Cpu className="h-3.5 w-3.5" />
            检测失败：{error}
          </p>
        </div>
      ) : null}
    </div>
  )
}
