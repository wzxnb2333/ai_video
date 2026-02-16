import { t } from '@/lib/i18n'
import type { AppLanguage } from '@/lib/i18n'
import { UPSCALE_MODELS } from '@/types/models'
import type { InterpolateParams, UpscaleParams, WorkflowOrderStrategy } from '@/types/models'
import type { WorkflowTaskParams } from '@/types/pipeline'

export type WorkflowOrder = 'interpolate-first' | 'upscale-first'

interface WorkflowSourceShape {
  width: number
  height: number
  fps: number
  totalFrames: number
}

interface WorkflowOrderEstimate {
  interpolateFirstCost: number
  upscaleFirstCost: number
}

export interface WorkflowDerivedPlan {
  order: WorkflowOrder
  upscaleParams: UpscaleParams
  interpolateParams: InterpolateParams
  shouldInterpolate: boolean
  sequenceFps: number
  outputFps: number
  outputWidth: number | null
  outputHeight: number | null
  steps: Array<'upscale' | 'interpolate'>
}

const UPSCALE_WORK_WEIGHT = 1
const INTERPOLATE_WORK_WEIGHT = 0.72
const UPSCALE_SCALE_OPTIONS: Array<2 | 4> = [2, 4]
const INTERPOLATE_MULTIPLIER_OPTIONS: Array<2 | 3 | 4 | 8> = [2, 3, 4, 8]

function normalizeDimension(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback
}

function normalizeFrameRate(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 30
}

function normalizeFrameCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 300
}

function pickScaleForTarget(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): 2 | 4 | null {
  const ratio = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  for (const option of UPSCALE_SCALE_OPTIONS) {
    if (option >= ratio) {
      return option
    }
  }
  return null
}

function resolveSupportedScales(modelName: string): Array<2 | 4> {
  const model = UPSCALE_MODELS.find((entry) => entry.name === modelName)
  if (!model) {
    return [2, 4]
  }
  return model.supportedScales
    .filter((value): value is 2 | 4 => value === 2 || value === 4)
    .sort((a, b) => a - b)
}

function pickScaleFromSupported(
  supportedScales: Array<2 | 4>,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): 2 | 4 | null {
  const ratio = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  for (const option of supportedScales) {
    if (option >= ratio) {
      return option
    }
  }
  return null
}

function pickFallbackModelForScale(scale: 2 | 4): string | null {
  const model = UPSCALE_MODELS.find((entry) => entry.supportedScales.includes(scale))
  return model?.name ?? null
}

function pickInterpolationMultiplier(sourceFps: number, targetFps: number): 2 | 3 | 4 | 8 | null {
  const ratio = targetFps / sourceFps
  for (const option of INTERPOLATE_MULTIPLIER_OPTIONS) {
    if (option >= ratio) {
      return option
    }
  }
  return null
}

function estimateOrderCost(
  source: WorkflowSourceShape,
  upscaleParams: UpscaleParams,
  interpolateParams: InterpolateParams,
): WorkflowOrderEstimate {
  const width = normalizeDimension(source.width, 1920)
  const height = normalizeDimension(source.height, 1080)
  const frames = normalizeFrameCount(source.totalFrames)
  const sourcePixels = width * height
  const scaleAreaFactor = upscaleParams.scale * upscaleParams.scale
  const frameMultiplier = interpolateParams.multiplier

  const interpolateFirstCost =
    sourcePixels * frames * INTERPOLATE_WORK_WEIGHT +
    sourcePixels * scaleAreaFactor * frames * frameMultiplier * UPSCALE_WORK_WEIGHT

  const upscaleFirstCost =
    sourcePixels * scaleAreaFactor * frames * UPSCALE_WORK_WEIGHT +
    sourcePixels * scaleAreaFactor * frames * INTERPOLATE_WORK_WEIGHT

  return {
    interpolateFirstCost,
    upscaleFirstCost,
  }
}

function resolveOrder(
  strategy: WorkflowOrderStrategy,
  source: WorkflowSourceShape,
  upscaleParams: UpscaleParams,
  interpolateParams: InterpolateParams,
  shouldInterpolate: boolean,
): WorkflowOrder {
  if (!shouldInterpolate) {
    return 'upscale-first'
  }

  if (strategy === 'interpolate-first' || strategy === 'upscale-first') {
    return strategy
  }

  const estimate = estimateOrderCost(source, upscaleParams, interpolateParams)
  return estimate.upscaleFirstCost <= estimate.interpolateFirstCost
    ? 'upscale-first'
    : 'interpolate-first'
}

export function getWorkflowOrderLabel(order: WorkflowOrder, language: AppLanguage = 'zh-CN'): string {
  return order === 'upscale-first'
    ? t(language, '先超分后补帧', 'Upscale then interpolate')
    : t(language, '先补帧后超分', 'Interpolate then upscale')
}

export function resolveWorkflowPlan(
  source: WorkflowSourceShape,
  workflow: WorkflowTaskParams,
  language: AppLanguage = 'zh-CN',
): WorkflowDerivedPlan {
  const sourceWidth = normalizeDimension(source.width, 1920)
  const sourceHeight = normalizeDimension(source.height, 1080)
  const sourceFps = normalizeFrameRate(source.fps)
  const normalizedSource: WorkflowSourceShape = {
    width: sourceWidth,
    height: sourceHeight,
    fps: sourceFps,
    totalFrames: normalizeFrameCount(source.totalFrames),
  }

  let upscaleParams: UpscaleParams = { ...workflow.upscale, customArgs: [...workflow.upscale.customArgs] }
  let interpolateParams: InterpolateParams = { ...workflow.interpolate, customArgs: [...workflow.interpolate.customArgs] }
  let shouldInterpolate = true
  let outputFps = sourceFps * interpolateParams.multiplier
  let sequenceFps = outputFps
  let outputWidth: number | null = null
  let outputHeight: number | null = null

  if (workflow.outputMode === 'target') {
    const targetWidth = normalizeDimension(workflow.targetWidth, sourceWidth * 2)
    const targetHeight = normalizeDimension(workflow.targetHeight, sourceHeight * 2)
    const targetFps = normalizeFrameRate(workflow.targetFps)
    const supportedScales = resolveSupportedScales(upscaleParams.model)
    const chosenScale = pickScaleFromSupported(
      supportedScales,
      sourceWidth,
      sourceHeight,
      targetWidth,
      targetHeight,
    )
    if (!chosenScale) {
      const anyScaleChoice = pickScaleForTarget(sourceWidth, sourceHeight, targetWidth, targetHeight)
      if (!anyScaleChoice) {
        throw new Error(t(
          language,
          `目标分辨率 ${targetWidth}x${targetHeight} 超过当前单次超分能力（最大 4x）。`,
          `Target resolution ${targetWidth}x${targetHeight} exceeds current single-pass upscale capability (max 4x).`,
        ))
      }

      const fallbackModel = pickFallbackModelForScale(anyScaleChoice)
      if (!fallbackModel) {
        throw new Error(t(
          language,
          `当前模型 ${upscaleParams.model} 不支持达到目标分辨率所需倍率。`,
          `Current model ${upscaleParams.model} does not support the required scale for target resolution.`,
        ))
      }

      upscaleParams = {
        ...upscaleParams,
        model: fallbackModel,
        scale: anyScaleChoice,
      }
    } else {
      upscaleParams = {
        ...upscaleParams,
        scale: chosenScale,
      }
    }

    const maxUpscaledWidth = sourceWidth * upscaleParams.scale
    const maxUpscaledHeight = sourceHeight * upscaleParams.scale
    outputWidth = targetWidth !== maxUpscaledWidth || targetHeight !== maxUpscaledHeight ? targetWidth : null
    outputHeight = targetWidth !== maxUpscaledWidth || targetHeight !== maxUpscaledHeight ? targetHeight : null

    if (targetFps <= sourceFps) {
      shouldInterpolate = false
      sequenceFps = sourceFps
      outputFps = targetFps
    } else {
      const chosenMultiplier = pickInterpolationMultiplier(sourceFps, targetFps)
      if (!chosenMultiplier) {
        throw new Error(t(
          language,
          `目标帧率 ${targetFps} 超过当前补帧能力（最大 8x）。`,
          `Target FPS ${targetFps} exceeds current interpolation capability (max 8x).`,
        ))
      }

      interpolateParams = {
        ...interpolateParams,
        multiplier: chosenMultiplier,
      }

      sequenceFps = sourceFps * chosenMultiplier
      outputFps = targetFps
    }
  }

  const runtimeSupportedScales = resolveSupportedScales(upscaleParams.model)
  if (!runtimeSupportedScales.includes(upscaleParams.scale)) {
    const fallbackModel = pickFallbackModelForScale(upscaleParams.scale)
    if (!fallbackModel) {
      throw new Error(t(
        language,
        `模型 ${upscaleParams.model} 不支持 ${upscaleParams.scale}x 放大。`,
        `Model ${upscaleParams.model} does not support ${upscaleParams.scale}x upscale.`,
      ))
    }
    upscaleParams = {
      ...upscaleParams,
      model: fallbackModel,
    }
  }

  const order = resolveOrder(
    workflow.orderStrategy,
    normalizedSource,
    upscaleParams,
    interpolateParams,
    shouldInterpolate,
  )

  const steps: Array<'upscale' | 'interpolate'> = shouldInterpolate
    ? (order === 'upscale-first' ? ['upscale', 'interpolate'] : ['interpolate', 'upscale'])
    : ['upscale']

  return {
    order,
    upscaleParams,
    interpolateParams,
    shouldInterpolate,
    sequenceFps,
    outputFps,
    outputWidth,
    outputHeight,
    steps,
  }
}

export function describeWorkflowAutoChoice(
  source: WorkflowSourceShape,
  workflow: WorkflowTaskParams,
  language: AppLanguage = 'zh-CN',
): { order: WorkflowOrder; message: string } {
  const plan = resolveWorkflowPlan(source, workflow, language)

  if (workflow.orderStrategy !== 'auto') {
    return {
      order: plan.order,
      message: `${t(language, '已固定顺序：', 'Fixed order: ')}${getWorkflowOrderLabel(plan.order, language)}`,
    }
  }

  if (!plan.shouldInterpolate) {
    return {
      order: plan.order,
      message: t(
        language,
        '自动建议：仅执行超分，目标帧率不高于源帧率。',
        'Auto suggestion: upscale only, because target FPS is not higher than source FPS.',
      ),
    }
  }

  const estimate = estimateOrderCost(source, plan.upscaleParams, plan.interpolateParams)
  const faster = Math.max(estimate.interpolateFirstCost, estimate.upscaleFirstCost)
  const slower = Math.min(estimate.interpolateFirstCost, estimate.upscaleFirstCost)
  const speedGain = faster > 0 ? Math.round(((faster - slower) / faster) * 100) : 0

  return {
    order: plan.order,
    message: t(
      language,
      `自动建议：${getWorkflowOrderLabel(plan.order, language)}，预计速度优势约 ${Math.max(0, speedGain)}%。`,
      `Auto suggestion: ${getWorkflowOrderLabel(plan.order, language)} with about ${Math.max(0, speedGain)}% speed advantage.`,
    ),
  }
}
