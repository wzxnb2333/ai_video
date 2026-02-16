import { Gauge, WandSparkles } from 'lucide-react'

import { GpuCheckPanel } from '@/components/settings/gpu-check-panel'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { t } from '@/lib/i18n'
import { useSettingsStore } from '@/stores/settings.store'
import { INTERPOLATE_MODELS } from '@/types/models'

const THREAD_PRESET_OPTIONS = [
  { id: 'preset-484', labelZh: '高性能 4:8:4', labelEn: 'High performance 4:8:4', threadSpec: '4:8:4' },
  { id: 'preset-464', labelZh: '均衡 4:6:4', labelEn: 'Balanced 4:6:4', threadSpec: '4:6:4' },
  { id: 'preset-364', labelZh: '稳定 3:6:4', labelEn: 'Stable 3:6:4', threadSpec: '3:6:4' },
  { id: 'preset-232', labelZh: 'UHD 2:3:2', labelEn: 'UHD 2:3:2', threadSpec: '2:3:2' },
  { id: 'preset-auto', labelZh: '自动（按显存）', labelEn: 'Auto (by VRAM)', threadSpec: '' },
] as const

export function InterpolateParamsPanel(): React.JSX.Element {
  const language = useSettingsStore((state) => state.language)
  const tt = (zh: string, en: string): string => t(language, zh, en)
  const params = useSettingsStore((state) => state.interpolateParams)
  const setInterpolateParams = useSettingsStore((state) => state.setInterpolateParams)

  const selectedModel =
    INTERPOLATE_MODELS.find((model) => model.name === params.model) ?? INTERPOLATE_MODELS[0]
  const selectedThreadPresetId =
    THREAD_PRESET_OPTIONS.find((option) => option.threadSpec === params.threadSpec)?.id ?? 'preset-custom'

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/75 shadow-[0_18px_45px_-30px_rgba(34,197,94,0.42)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
          <Gauge className="h-5 w-5 text-emerald-300" />
          {tt('补帧参数', 'Interpolation Parameters')}
        </CardTitle>
        <CardDescription className="text-zinc-950 dark:text-zinc-400">
          {tt('通过模型与倍率配置，让运动画面更丝滑。', 'Tune model and multiplier for smoother motion.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{tt('模型', 'Model')}</Label>
          <Select
            value={params.model}
            onValueChange={(value) => {
              const model = INTERPOLATE_MODELS.find((entry) => entry.name === value)
              if (!model) {
                return
              }
              setInterpolateParams({
                model: model.name,
                multiplier: model.supportedMultipliers.includes(params.multiplier)
                  ? params.multiplier
                  : model.defaultMultiplier,
              })
            }}
          >
            <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERPOLATE_MODELS.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="flex items-start gap-2 text-xs text-zinc-950 dark:text-zinc-400">
            <WandSparkles className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />
            {selectedModel.description}
          </p>
        </div>

        <div className="space-y-2">
          <Label>{tt('补帧倍率', 'Multiplier')}</Label>
          <Select
            value={String(params.multiplier)}
            onValueChange={(value) => {
              setInterpolateParams({ multiplier: Number(value) as 2 | 3 | 4 | 8 })
            }}
          >
            <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedModel.supportedMultipliers.map((multiplier) => (
                <SelectItem key={multiplier} value={String(multiplier)}>
                  {multiplier}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tt('UHD 模式', 'UHD Mode')}</p>
            <p className="text-xs text-zinc-950 dark:text-zinc-400">{tt('针对 4K 工作流优化显存策略。', 'Optimized VRAM strategy for 4K workflows.')}</p>
          </div>
          <Switch
            checked={params.uhd}
            onCheckedChange={(checked) => {
              setInterpolateParams({ uhd: checked })
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interpolate-gpu">{tt('GPU 编号（-1 为自动）', 'GPU index (-1 = auto)')}</Label>
          <Input
            id="interpolate-gpu"
            type="number"
            min={-1}
            step={1}
            value={params.gpuId}
            className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            onChange={(event) => {
              setInterpolateParams({ gpuId: Number(event.target.value) })
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>{tt('补帧线程预设', 'Interpolation thread preset')}</Label>
          <Select
            value={selectedThreadPresetId}
            onValueChange={(value) => {
              if (value === 'preset-custom') {
                return
              }
              const preset = THREAD_PRESET_OPTIONS.find((option) => option.id === value)
              if (!preset) {
                return
              }
              setInterpolateParams({ threadSpec: preset.threadSpec })
            }}
          >
            <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THREAD_PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {tt(option.labelZh, option.labelEn)}
                </SelectItem>
              ))}
              <SelectItem value="preset-custom">{tt('自定义（保持当前）', 'Custom (keep current)')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interpolate-thread-spec">{tt('补帧线程参数（留空自动）', 'Interpolation thread spec (empty = auto)')}</Label>
          <Input
            id="interpolate-thread-spec"
            type="text"
            value={params.threadSpec}
            placeholder={tt('示例: 4:6:4', 'Example: 4:6:4')}
            className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            onChange={(event) => {
              setInterpolateParams({ threadSpec: event.target.value })
            }}
          />
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {tt(
              '对应 rife 的 -j load:proc:save，建议先用自动，再尝试 4:6:4 或 4:8:4。',
              'Maps to rife -j load:proc:save. Start with auto, then try 4:6:4 or 4:8:4.',
            )}
          </p>
        </div>

        <GpuCheckPanel />
      </CardContent>
    </Card>
  )
}
