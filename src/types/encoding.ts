export type SoftwareEncoder = 'libx264' | 'libx265'
export type HardwareEncoder = 'h264_nvenc' | 'hevc_nvenc'

export interface EncodeSettings {
  useHardwareEncoding: boolean
  softwareEncoder: SoftwareEncoder
  hardwareEncoder: HardwareEncoder
}

export const DEFAULT_ENCODE_SETTINGS: EncodeSettings = {
  useHardwareEncoding: true,
  softwareEncoder: 'libx264',
  hardwareEncoder: 'h264_nvenc',
}
