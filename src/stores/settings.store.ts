import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  DEFAULT_INTERPOLATE_PARAMS,
  DEFAULT_UPSCALE_PARAMS,
} from '@/types/models'
import { DEFAULT_ENCODE_SETTINGS } from '@/types/encoding'
import type { InterpolateParams, UpscaleParams } from '@/types/models'
import type { EncodeSettings, HardwareEncoder, SoftwareEncoder } from '@/types/encoding'

export interface SettingsState {
  upscaleParams: UpscaleParams
  interpolateParams: InterpolateParams
  encodeSettings: EncodeSettings
  outputDirectory: string
  theme: 'dark' | 'light' | 'system'
  setUpscaleParams: (params: Partial<UpscaleParams>) => void
  setInterpolateParams: (params: Partial<InterpolateParams>) => void
  setEncodeSettings: (settings: Partial<EncodeSettings>) => void
  setUseHardwareEncoding: (enabled: boolean) => void
  setSoftwareEncoder: (encoder: SoftwareEncoder) => void
  setHardwareEncoder: (encoder: HardwareEncoder) => void
  setOutputDirectory: (dir: string) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
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
  return {
    ...DEFAULT_UPSCALE_PARAMS,
    ...raw,
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
      encodeSettings: DEFAULT_ENCODE_SETTINGS,
      outputDirectory: '',
      theme: 'dark',
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
    }),
    {
      name: 'ai-video-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        upscaleParams: state.upscaleParams,
        interpolateParams: state.interpolateParams,
        encodeSettings: state.encodeSettings,
        outputDirectory: state.outputDirectory,
        theme: state.theme,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>
        return {
          ...current,
          ...saved,
          upscaleParams: normalizeUpscaleParams(saved.upscaleParams),
          interpolateParams: normalizeInterpolateParams(saved.interpolateParams),
          encodeSettings: normalizeEncodeSettings(saved.encodeSettings),
          outputDirectory: typeof saved.outputDirectory === 'string' ? saved.outputDirectory : current.outputDirectory,
          theme: saved.theme === 'dark' || saved.theme === 'light' || saved.theme === 'system' ? saved.theme : current.theme,
        }
      },
    },
  ),
)
