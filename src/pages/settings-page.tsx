import { FolderOpen, Languages, MonitorCog, Moon, Sun } from 'lucide-react'

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
import { t } from '@/lib/i18n'
import { useSettingsStore } from '@/stores/settings.store'
import { open } from '@tauri-apps/plugin-dialog'

export function SettingsPage(): React.JSX.Element {
  const outputDirectory = useSettingsStore((state) => state.outputDirectory)
  const setOutputDirectory = useSettingsStore((state) => state.setOutputDirectory)
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const language = useSettingsStore((state) => state.language)
  const setLanguage = useSettingsStore((state) => state.setLanguage)
  const encodeSettings = useSettingsStore((state) => state.encodeSettings)
  const setUseHardwareEncoding = useSettingsStore((state) => state.setUseHardwareEncoding)
  const setSoftwareEncoder = useSettingsStore((state) => state.setSoftwareEncoder)
  const setHardwareEncoder = useSettingsStore((state) => state.setHardwareEncoder)
  const tt = (zh: string, en: string): string => t(language, zh, en)

  const handleThemeChange = (value: string): void => {
    if (value === 'dark' || value === 'light' || value === 'system') {
      setTheme(value)
    }
  }

  const handleLanguageChange = (value: string): void => {
    if (value === 'zh-CN' || value === 'en-US') {
      setLanguage(value)
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
            {tt('输出配置', 'Output')}
          </CardTitle>
          <CardDescription className="text-zinc-950 dark:text-zinc-400">
            {tt('选择处理后视频的保存位置。', 'Choose where processed videos are saved.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label>{tt('输出目录', 'Output directory')}</Label>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-3 text-sm text-zinc-600 dark:text-zinc-300">
            {outputDirectory || tt('尚未选择文件夹', 'No folder selected')}
          </div>
          <Button className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400" onClick={pickDirectory}>
            {tt('选择文件夹', 'Choose folder')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <MonitorCog className="h-5 w-5 text-amber-300" />
            {tt('体验设置', 'Experience')}
          </CardTitle>
          <CardDescription className="text-zinc-950 dark:text-zinc-400">
            {tt('设置主题与应用显示偏好。', 'Set theme and display preferences.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>{tt('主题模式', 'Theme')}</Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{tt('深色', 'Dark')}</SelectItem>
                <SelectItem value="light">{tt('浅色', 'Light')}</SelectItem>
                <SelectItem value="system">{tt('跟随系统', 'System')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{tt('界面语言', 'Language')}</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
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
              {tt('深色', 'Dark')}
            </Button>
            <Button
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setTheme('light')}
            >
              <Sun className="mr-2 h-4 w-4" />
              {tt('浅色', 'Light')}
            </Button>
            <Button
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setTheme('system')}
            >
              {tt('跟随系统', 'System')}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setLanguage('zh-CN')}
            >
              <Languages className="mr-2 h-4 w-4" />
              简体中文
            </Button>
            <Button
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setLanguage('en-US')}
            >
              <Languages className="mr-2 h-4 w-4" />
              English
            </Button>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-800" />

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {tt('AI 视频处理助手', 'AI Video Processing Assistant')}
            </p>
            <p className="mt-1 text-sm text-zinc-950 dark:text-zinc-400">
              {tt(
                '基于 Tauri v2 的本地超分辨率与补帧工作流套件。',
                'A local upscale and interpolation workflow suite built on Tauri v2.',
              )}
            </p>
            <Badge className="mt-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
              {tt('版本 0.1.0', 'Version 0.1.0')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <MonitorCog className="h-5 w-5 text-emerald-300" />
            {tt('通用编码设置', 'General Encoding')}
          </CardTitle>
          <CardDescription className="text-zinc-950 dark:text-zinc-400">
            {tt('统一控制软件编码与硬件编码策略。', 'Control software/hardware encoding policy globally.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tt('启用硬件编码', 'Enable hardware encoding')}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {tt('启用后使用 NVENC，关闭则使用软件编码。', 'Use NVENC when enabled; otherwise use software encoding.')}
              </p>
            </div>
            <Switch
              checked={encodeSettings.useHardwareEncoding}
              onCheckedChange={(enabled) => {
                setUseHardwareEncoding(enabled)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>{tt('软件编码器', 'Software encoder')}</Label>
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
            <Label>{tt('硬件编码器', 'Hardware encoder')}</Label>
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
