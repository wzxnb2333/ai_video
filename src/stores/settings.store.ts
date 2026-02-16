import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { DEFAULT_APP_LANGUAGE, isAppLanguage } from '@/lib/i18n'
import {
  DEFAULT_INTERPOLATE_PARAMS,
  DEFAULT_UPSCALE_PARAMS,
  DEFAULT_WORKFLOW_SETTINGS,
} from '@/types/models'
import { DEFAULT_ENCODE_SETTINGS } from '@/types/encoding'
import type { InterpolateParams, UpscaleParams, WorkflowSettings } from '@/types/models'
import type { EncodeSettings, HardwareEncoder, SoftwareEncoder } from '@/types/encoding'
import type { AppLanguage } from '@/lib/i18n'

export interface SettingsState {
  upscaleParams: UpscaleParams
  interpolateParams: InterpolateParams
  workflowSettings: WorkflowSettings
  encodeSettings: EncodeSettings
  outputDirectory: string
  theme: 'dark' | 'light' | 'system'
  language: AppLanguage
  setUpscaleParams: (params: Partial<UpscaleParams>) => void
  setInterpolateParams: (params: Partial<InterpolateParams>) => void
  setWorkflowSettings: (settings: Partial<WorkflowSettings>) => void
  setEncodeSettings: (settings: Partial<EncodeSettings>) => void
  setUseHardwareEncoding: (enabled: boolean) => void
  setSoftwareEncoder: (encoder: SoftwareEncoder) => void
  setHardwareEncoder: (encoder: HardwareEncoder) => void
  setOutputDirectory: (dir: string) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  setLanguage: (language: AppLanguage) => void
}

function normalizeGpuId(value: unknown): number {
  if (value === 'auto') {
    return -1
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.trunc(numeric)
}

function normalizeUpscaleParams(value: unknown): UpscaleParams {
  const raw = (value ?? {}) as Partial<UpscaleParams>
  const tileSizeValue = typeof raw.tileSize === 'number' ? raw.tileSize : Number(raw.tileSize)
  const tileSize = Number.isFinite(tileSizeValue) ? Math.max(0, Math.trunc(tileSizeValue)) : DEFAULT_UPSCALE_PARAMS.tileSize
  const threadSpec = typeof raw.threadSpec === 'string'
    ? raw.threadSpec.trim()
    : DEFAULT_UPSCALE_PARAMS.threadSpec
  const scale = raw.scale === 2 || raw.scale === 4 ? raw.scale : DEFAULT_UPSCALE_PARAMS.scale
  return {
    ...DEFAULT_UPSCALE_PARAMS,
    ...raw,
    scale,
    tileSize,
    threadSpec,
    gpuId: normalizeGpuId(raw.gpuId),
  }
}

function normalizeInterpolateParams(value: unknown): InterpolateParams {
  const raw = (value ?? {}) as Partial<InterpolateParams>
  const threadSpec = typeof raw.threadSpec === 'string'
    ? raw.threadSpec.trim()
    : DEFAULT_INTERPOLATE_PARAMS.threadSpec
  return {
    ...DEFAULT_INTERPOLATE_PARAMS,
    ...raw,
    gpuId: normalizeGpuId(raw.gpuId),
    threadSpec,
  }
}

function normalizeWorkflowSettings(value: unknown): WorkflowSettings {
  const raw = (value ?? {}) as Partial<WorkflowSettings>
  const orderStrategy = raw.orderStrategy === 'interpolate-first' || raw.orderStrategy === 'upscale-first' || raw.orderStrategy === 'auto'
    ? raw.orderStrategy
    : DEFAULT_WORKFLOW_SETTINGS.orderStrategy
  const outputMode = raw.outputMode === 'target' || raw.outputMode === 'ratio'
    ? raw.outputMode
    : DEFAULT_WORKFLOW_SETTINGS.outputMode
  const targetWidthRaw = typeof raw.targetWidth === 'number' ? raw.targetWidth : Number(raw.targetWidth)
  const targetHeightRaw = typeof raw.targetHeight === 'number' ? raw.targetHeight : Number(raw.targetHeight)
  const targetFpsRaw = typeof raw.targetFps === 'number' ? raw.targetFps : Number(raw.targetFps)
  const targetWidth = Number.isFinite(targetWidthRaw) ? Math.max(1, Math.trunc(targetWidthRaw)) : DEFAULT_WORKFLOW_SETTINGS.targetWidth
  const targetHeight = Number.isFinite(targetHeightRaw) ? Math.max(1, Math.trunc(targetHeightRaw)) : DEFAULT_WORKFLOW_SETTINGS.targetHeight
  const targetFps = Number.isFinite(targetFpsRaw) ? Math.max(1, targetFpsRaw) : DEFAULT_WORKFLOW_SETTINGS.targetFps

  return {
    orderStrategy,
    outputMode,
    targetWidth,
    targetHeight,
    targetFps,
  }
}

function normalizeEncodeSettings(value: unknown): EncodeSettings {
  const raw = (value ?? {}) as Partial<EncodeSettings>
  const useHardwareEncoding = typeof raw.useHardwareEncoding === 'boolean'
    ? raw.useHardwareEncoding
    : DEFAULT_ENCODE_SETTINGS.useHardwareEncoding
  const softwareEncoder = raw.softwareEncoder === 'libx264' || raw.softwareEncoder === 'libx265'
    ? raw.softwareEncoder
    : DEFAULT_ENCODE_SETTINGS.softwareEncoder
  const hardwareEncoder = raw.hardwareEncoder === 'h264_nvenc' || raw.hardwareEncoder === 'hevc_nvenc'
    ? raw.hardwareEncoder
    : DEFAULT_ENCODE_SETTINGS.hardwareEncoder

  return {
    useHardwareEncoding,
    softwareEncoder,
    hardwareEncoder,
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      upscaleParams: DEFAULT_UPSCALE_PARAMS,
      interpolateParams: DEFAULT_INTERPOLATE_PARAMS,
      workflowSettings: DEFAULT_WORKFLOW_SETTINGS,
      encodeSettings: DEFAULT_ENCODE_SETTINGS,
      outputDirectory: '',
      theme: 'dark',
      language: DEFAULT_APP_LANGUAGE,
      setUpscaleParams: (params) => {
        set((state) => ({
          upscaleParams: normalizeUpscaleParams({
            ...state.upscaleParams,
            ...params,
          }),
        }))
      },
      setInterpolateParams: (params) => {
        set((state) => ({
          interpolateParams: normalizeInterpolateParams({
            ...state.interpolateParams,
            ...params,
          }),
        }))
      },
      setWorkflowSettings: (settings) => {
        set((state) => ({
          workflowSettings: normalizeWorkflowSettings({
            ...state.workflowSettings,
            ...settings,
          }),
        }))
      },
      setEncodeSettings: (settings) => {
        set((state) => ({
          encodeSettings: normalizeEncodeSettings({
            ...state.encodeSettings,
            ...settings,
          }),
        }))
      },
      setUseHardwareEncoding: (enabled) => {
        set((state) => ({
          encodeSettings: normalizeEncodeSettings({
            ...state.encodeSettings,
            useHardwareEncoding: enabled,
          }),
        }))
      },
      setSoftwareEncoder: (encoder) => {
        set((state) => ({
          encodeSettings: normalizeEncodeSettings({
            ...state.encodeSettings,
            softwareEncoder: encoder,
          }),
        }))
      },
      setHardwareEncoder: (encoder) => {
        set((state) => ({
          encodeSettings: normalizeEncodeSettings({
            ...state.encodeSettings,
            hardwareEncoder: encoder,
          }),
        }))
      },
      setOutputDirectory: (dir) => {
        set({ outputDirectory: dir })
      },
      setTheme: (theme) => {
        set({ theme })
      },
      setLanguage: (language) => {
        set({ language })
      },
    }),
    {
      name: 'ai-video-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        upscaleParams: state.upscaleParams,
        interpolateParams: state.interpolateParams,
        workflowSettings: state.workflowSettings,
        encodeSettings: state.encodeSettings,
        outputDirectory: state.outputDirectory,
        theme: state.theme,
        language: state.language,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>
        return {
          ...current,
          ...saved,
          upscaleParams: normalizeUpscaleParams(saved.upscaleParams),
          interpolateParams: normalizeInterpolateParams(saved.interpolateParams),
          workflowSettings: normalizeWorkflowSettings(saved.workflowSettings),
          encodeSettings: normalizeEncodeSettings(saved.encodeSettings),
          outputDirectory: typeof saved.outputDirectory === 'string' ? saved.outputDirectory : current.outputDirectory,
          theme: saved.theme === 'dark' || saved.theme === 'light' || saved.theme === 'system' ? saved.theme : current.theme,
          language: isAppLanguage(saved.language) ? saved.language : current.language,
        }
      },
    },
  ),
)
