import { FolderOpen, MonitorCog, Moon, Sun } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { open } from '@tauri-apps/plugin-dialog'
import { useSettingsStore } from '@/stores/settings.store'

export function SettingsPage(): React.JSX.Element {
  const outputDirectory = useSettingsStore((state) => state.outputDirectory)
  const setOutputDirectory = useSettingsStore((state) => state.setOutputDirectory)
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const encodeSettings = useSettingsStore((state) => state.encodeSettings)
  const setUseHardwareEncoding = useSettingsStore((state) => state.setUseHardwareEncoding)
  const setSoftwareEncoder = useSettingsStore((state) => state.setSoftwareEncoder)
  const setHardwareEncoder = useSettingsStore((state) => state.setHardwareEncoder)

  const handleThemeChange = (value: string): void => {
    if (value === 'dark' || value === 'light' || value === 'system') {
      setTheme(value)
    }
  }

  const pickDirectory = async (): Promise<void> => {
    const selected = await open({
      directory: true,
      multiple: false,
    })

    if (!selected || Array.isArray(selected)) {
      return
    }
    setOutputDirectory(selected)
  }

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <FolderOpen className="h-5 w-5 text-cyan-300" />
            输出配置
          </CardTitle>
          <CardDescription className="text-zinc-950 dark:text-zinc-400">选择处理后视频的保存位置。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label>输出目录</Label>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-3 text-sm text-zinc-600 dark:text-zinc-300">
            {outputDirectory || '尚未选择文件夹'}
          </div>
          <Button className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400" onClick={pickDirectory}>
            选择文件夹
          </Button>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <MonitorCog className="h-5 w-5 text-amber-300" />
            体验设置
          </CardTitle>
          <CardDescription className="text-zinc-950 dark:text-zinc-400">设置主题与应用显示偏好。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>主题模式</Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">深色</SelectItem>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="system">跟随系统</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setTheme('dark')}
            >
              <Moon className="mr-2 h-4 w-4" />
              深色
            </Button>
            <Button
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setTheme('light')}
            >
              <Sun className="mr-2 h-4 w-4" />
              浅色
            </Button>
            <Button
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setTheme('system')}
            >
              跟随系统
            </Button>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-800" />

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI 视频处理助手</p>
            <p className="mt-1 text-sm text-zinc-950 dark:text-zinc-400">基于 Tauri v2 的本地超分辨率与补帧工作流套件。</p>
            <Badge className="mt-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">版本 0.1.0</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <MonitorCog className="h-5 w-5 text-emerald-300" />
            通用编码设置
          </CardTitle>
          <CardDescription className="text-zinc-950 dark:text-zinc-400">统一控制软件编码与硬件编码策略。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">启用硬件编码</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">启用后使用 NVENC，关闭则使用软件编码。</p>
            </div>
            <Switch
              checked={encodeSettings.useHardwareEncoding}
              onCheckedChange={(enabled) => {
                setUseHardwareEncoding(enabled)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>软件编码器</Label>
            <Select
              value={encodeSettings.softwareEncoder}
              onValueChange={(value) => {
                if (value === 'libx264' || value === 'libx265') {
                  setSoftwareEncoder(value)
                }
              }}
            >
              <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="libx264">libx264 (H.264)</SelectItem>
                <SelectItem value="libx265">libx265 (H.265)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>硬件编码器</Label>
            <Select
              value={encodeSettings.hardwareEncoder}
              onValueChange={(value) => {
                if (value === 'h264_nvenc' || value === 'hevc_nvenc') {
                  setHardwareEncoder(value)
                }
              }}
            >
              <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h264_nvenc">h264_nvenc (H.264)</SelectItem>
                <SelectItem value="hevc_nvenc">hevc_nvenc (H.265)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
