import { ImageUpscale, Sparkles } from 'lucide-react'

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
import { Slider } from '@/components/ui/slider'
import { GpuCheckPanel } from '@/components/settings/gpu-check-panel'
import { UPSCALE_MODELS } from '@/types/models'
import { useSettingsStore } from '@/stores/settings.store'

const UPSCALE_PERFORMANCE_PRESETS = [
  { id: 'preset-484', label: '高性能 4:8:4 + Tile 320', tileSize: 320, threadSpec: '4:8:4' },
  { id: 'preset-464', label: '均衡 4:6:4 + Tile 256', tileSize: 256, threadSpec: '4:6:4' },
  { id: 'preset-343', label: '稳定 3:4:3 + Tile 192', tileSize: 192, threadSpec: '3:4:3' },
  { id: 'preset-auto', label: '自动（按显存）', tileSize: 0, threadSpec: '' },
] as const

export function UpscaleParamsPanel(): React.JSX.Element {
  const params = useSettingsStore((state) => state.upscaleParams)
  const setUpscaleParams = useSettingsStore((state) => state.setUpscaleParams)
  const availableScales: Array<2 | 3 | 4> = [2, 3, 4]

  const selectedModel = UPSCALE_MODELS.find((model) => model.name === params.model) ?? UPSCALE_MODELS[0]
  const selectedPresetId = UPSCALE_PERFORMANCE_PRESETS.find((preset) => (
    preset.tileSize === params.tileSize && preset.threadSpec === params.threadSpec
  ))?.id ?? 'preset-custom'

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/75 shadow-[0_18px_45px_-30px_rgba(8,145,178,0.45)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
          <ImageUpscale className="h-5 w-5 text-cyan-300" />
          超分辨率参数
        </CardTitle>
        <CardDescription className="text-zinc-950 dark:text-zinc-400">
          调整放大质量、速度与输出格式。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>模型</Label>
          <Select
            value={params.model}
            onValueChange={(value) => {
              const model = UPSCALE_MODELS.find((entry) => entry.name === value)
              if (!model) {
                return
              }
              const fallbackScale = model.supportedScales[0] as 2 | 3 | 4
              setUpscaleParams({
                model: model.name,
                scale: model.supportedScales.includes(params.scale) ? params.scale : fallbackScale,
              })
            }}
          >
            <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UPSCALE_MODELS.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="flex items-start gap-2 text-xs text-zinc-950 dark:text-zinc-400">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 text-cyan-300" />
            {selectedModel.description}
          </p>
        </div>

        <div className="space-y-2">
          <Label>放大倍率</Label>
          <Select
            value={String(params.scale)}
            onValueChange={(value) => {
              setUpscaleParams({ scale: Number(value) as 2 | 3 | 4 })
            }}
          >
            <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableScales
                .filter((scale) => selectedModel.supportedScales.includes(scale))
                .map((scale) => (
                  <SelectItem key={scale} value={String(scale)}>
                    {scale}x
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>降噪等级: {params.denoiseLevel}</Label>
          <Slider
            value={[params.denoiseLevel]}
            min={0}
            max={3}
            step={1}
            onValueChange={(value) => {
              const nextValue = value[0]
              if (nextValue === undefined) {
                return
              }
              setUpscaleParams({ denoiseLevel: nextValue as 0 | 1 | 2 | 3 })
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>超分性能预设（Tile + 线程）</Label>
          <Select
            value={selectedPresetId}
            onValueChange={(value) => {
              if (value === 'preset-custom') {
                return
              }
              const preset = UPSCALE_PERFORMANCE_PRESETS.find((option) => option.id === value)
              if (!preset) {
                return
              }
              setUpscaleParams({ tileSize: preset.tileSize, threadSpec: preset.threadSpec })
            }}
          >
            <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UPSCALE_PERFORMANCE_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value="preset-custom">自定义（保持当前）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tile-size">切片大小（0 为自动）</Label>
            <Input
              id="tile-size"
              type="number"
              min={0}
              value={params.tileSize}
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(event) => {
                setUpscaleParams({ tileSize: Number(event.target.value) })
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upscale-gpu">GPU 编号（-1 为自动）</Label>
            <Input
              id="upscale-gpu"
              type="number"
              min={-1}
              step={1}
              value={params.gpuId}
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(event) => {
                setUpscaleParams({ gpuId: Number(event.target.value) })
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="upscale-thread-spec">超分线程参数（留空自动）</Label>
          <Input
            id="upscale-thread-spec"
            type="text"
            value={params.threadSpec}
            placeholder="示例: 4:8:4"
            className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            onChange={(event) => {
              setUpscaleParams({ threadSpec: event.target.value })
            }}
          />
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            对应 waifu2x 的 -j load:proc:save。你这台机器建议优先使用 4:8:4。
          </p>
        </div>

        <GpuCheckPanel />

        <div className="space-y-2">
          <Label>输出格式</Label>
          <Select
            value={params.format}
            onValueChange={(value) => {
              setUpscaleParams({ format: value as 'png' | 'jpg' | 'webp' })
            }}
          >
            <SelectTrigger className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
              <SelectItem value="webp">WEBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
